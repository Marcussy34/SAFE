import { randomUUID } from "node:crypto";

import { createAuditRecord } from "@/lib/audit/auditLog";
import { DEMO_INTENT, DEMO_POLICY } from "@/lib/fixtures/demoPolicy";
import { createRequestFingerprint } from "@/lib/policy/requestFingerprint";
import { ReplayGuard } from "@/lib/policy/replayGuard";
import { evaluatePolicy } from "@/lib/policy/policyEngine";
import { fetchX402ChallengeFromResource, settleApprovedDecision } from "@/lib/safe/safePaymentService";
import type { SafePaidResourceResult, SafeSettlement } from "@/lib/safe/types";
import { getSafeDemoState } from "@/lib/runtime/demoState";
import { isLiveSolanaMode, type SolanaEnv } from "@/lib/solana/addresses";
import { hasLiveSignerEnv } from "@/lib/solana/liveSettlement";
import { prepareRuntimePreflightContext } from "@/lib/solana/runtimePreflight";
import { memoryStore } from "@/lib/store/memoryStore";
import type {
  Ap2StyleIntent,
  AuditRecord,
  MerchantCategory,
  NormalizedPaymentRequest,
  PolicyDecision,
  SpendPolicy
} from "@/lib/types";
import {
  createDemoPaymentRequirement,
  normalizePaymentRequirement,
  type DemoPaymentRequirement,
  withDemoPaymentAmount
} from "@/lib/x402/paymentRequirements";

export const DEFAULT_SAFE_DEMO_PROMPT =
  "Let my match-day agent spend up to $5 on match data, transit, and food vouchers. Block gambling, merch, unknown merchants, and PII.";

type DemoMode = "live-devnet" | "demo-settlement" | "dry-run";

export interface SafeGeneratedPolicy {
  policyId: string;
  userIntent: string;
  maxTotalUsdc: number;
  perPaymentCapUsdc: number;
  allowedCategories: MerchantCategory[];
  blockedCategories: MerchantCategory[];
  allowedDomains: string[];
  piiMode: string;
  network: string;
  allowanceAtomicUnits: string;
  replayWindowSeconds: number;
}

export interface SafeDemoRunStep {
  id: string;
  label: string;
  resourcePath: string;
  resourceUrl: string;
  agentReason: string;
  request: NormalizedPaymentRequest;
  decision: PolicyDecision;
  auditRecord?: AuditRecord;
  settlement?: SafeSettlement;
  explorerUrl?: string;
  resource?: SafePaidResourceResult;
}

export interface SafeDemoRunSummary {
  approved: number;
  blocked: number;
  redacted: number;
  settled: number;
  failed: number;
  attemptedSpendUsdc: number;
  settledSpendUsdc: number;
  auditRecords: number;
  dryRun: boolean;
}

export interface SafeDemoRunRecord {
  runId: string;
  startedAt: string;
  completedAt: string;
  prompt: string;
  mode: DemoMode;
  generatedPolicy: SafeGeneratedPolicy;
  allowance: {
    totalCapUsdc: number;
    remainingAtomicUnits: string;
    expiresAt: string;
  };
  steps: SafeDemoRunStep[];
  summary: SafeDemoRunSummary;
}

export interface SafeDemoRunInput {
  prompt?: string;
  dryRun?: boolean;
  requireLive?: boolean;
  baseUrl?: string;
  env?: SolanaEnv;
}

interface DemoStepDefinition {
  id: string;
  label: string;
  resourcePath: string;
  requirement: DemoPaymentRequirement;
  agentReason: string;
}

const MATCH_DAY_ALLOWED_CATEGORIES: MerchantCategory[] = ["match_data", "transit", "food_voucher"];
const ALL_DEMO_CATEGORIES: MerchantCategory[] = ["match_data", "transit", "food_voucher", "merch", "gambling", "unknown"];
const CATEGORY_DOMAINS: Record<MerchantCategory, string[]> = {
  match_data: ["stats-api.demo"],
  transit: ["transit-api.demo"],
  food_voucher: ["food-voucher.demo"],
  merch: ["official-merch.demo"],
  gambling: [],
  unknown: []
};
const CATEGORY_PROMPT_RULES: Array<{ category: MerchantCategory; patterns: RegExp[] }> = [
  {
    category: "match_data",
    patterns: [/\bmatch\s*-?\s*data\b/i, /\bmatch\s*-?\s*stats?\b/i, /\bstats?\b/i, /\bdata\s*feeds?\b/i]
  },
  {
    category: "transit",
    patterns: [/\btransit\b/i, /\btransport(?:ation)?\b/i, /\broutes?\b/i, /\bshuttle\b/i, /\btrains?\b/i, /\bbuses?\b/i]
  },
  {
    category: "food_voucher",
    patterns: [/\bfood\b/i, /\bmeal\b/i, /\bvouch(?:er|ers)?\b/i, /\bconcessions?\b/i]
  },
  {
    category: "merch",
    patterns: [/\bmerch\b/i, /\bmerchandise\b/i, /\bjerseys?\b/i, /\bsouvenirs?\b/i]
  },
  {
    category: "gambling",
    patterns: [/\bgambling\b/i, /\bbet(?:s|ting)?\b/i, /\bwagers?\b/i]
  },
  {
    category: "unknown",
    patterns: [/\bunknown(?:\s+merchants?)?\b/i, /\bunlisted(?:\s+merchants?)?\b/i]
  }
];
const BLOCKING_QUALIFIER = /\b(block|blocked|blocking|deny|denied|disallow|disallowed|exclude|excluded|except|no|not|without)\b/i;

function parseBudget(prompt: string): number {
  const match = prompt.match(/\$\s*([0-9]+(?:\.[0-9]+)?)/);
  const amount = match ? Number(match[1]) : DEMO_POLICY.totalCapUsdc;

  return Number.isFinite(amount) && amount > 0 ? amount : DEMO_POLICY.totalCapUsdc;
}

function normalizePromptForDisplay(prompt: string, budgetUsdc: number): string {
  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    return DEFAULT_SAFE_DEMO_PROMPT;
  }

  // Shells expand `$5` inside double quotes. Repair the common demo prompt.
  return trimmedPrompt.replace(/spend up to\s+on/i, `spend up to $${budgetUsdc} on`);
}

function globalPattern(pattern: RegExp): RegExp {
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  return new RegExp(pattern.source, flags);
}

function hasBlockingQualifier(prompt: string, matchIndex: number): boolean {
  const prefix = prompt.slice(Math.max(0, matchIndex - 32), matchIndex);
  return BLOCKING_QUALIFIER.test(prefix);
}

function categoryAppearsAsAllowed(prompt: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => {
    for (const match of prompt.matchAll(globalPattern(pattern))) {
      if (!hasBlockingQualifier(prompt, match.index ?? 0)) {
        return true;
      }
    }

    return false;
  });
}

function categoryAppearsAsBlocked(prompt: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => {
    for (const match of prompt.matchAll(globalPattern(pattern))) {
      if (hasBlockingQualifier(prompt, match.index ?? 0)) {
        return true;
      }
    }

    return false;
  });
}

function categoriesFromPrompt(prompt: string): MerchantCategory[] {
  const explicitlyAllowed = CATEGORY_PROMPT_RULES.filter((rule) =>
    categoryAppearsAsAllowed(prompt, rule.patterns)
  ).map((rule) => rule.category);
  const explicitlyBlocked = new Set(
    CATEGORY_PROMPT_RULES.filter((rule) => categoryAppearsAsBlocked(prompt, rule.patterns)).map((rule) => rule.category)
  );
  const baseline = explicitlyAllowed.length > 0 ? explicitlyAllowed : MATCH_DAY_ALLOWED_CATEGORIES;
  const defaultAllowed = new Set<MerchantCategory>();

  // Stats is the baseline x402 demo resource. Keep it unless the prompt blocks it.
  if (!explicitlyBlocked.has("match_data")) {
    defaultAllowed.add("match_data");
  }

  for (const category of baseline) {
    defaultAllowed.add(category);
  }

  return Array.from(defaultAllowed).filter((category) => !explicitlyBlocked.has(category));
}

function domainsForCategories(categories: MerchantCategory[]): string[] {
  return categories
    .flatMap((category) => CATEGORY_DOMAINS[category])
    .filter((domain, index, domains) => domain && domains.indexOf(domain) === index);
}

function blockedCategoriesFor(allowedCategories: MerchantCategory[]): MerchantCategory[] {
  const allowed = new Set(allowedCategories);
  const matchesDefaultPolicy =
    allowedCategories.length === DEMO_POLICY.allowedCategories.length &&
    DEMO_POLICY.allowedCategories.every((category, index) => category === allowedCategories[index]);

  if (matchesDefaultPolicy) {
    return [...DEMO_POLICY.blockedCategories];
  }

  return ALL_DEMO_CATEGORIES.filter((category) => !allowed.has(category));
}

function policyFromPrompt(prompt: string): SpendPolicy {
  const allowedCategories = categoriesFromPrompt(prompt);
  const allowedDomains = domainsForCategories(allowedCategories);

  return {
    ...DEMO_POLICY,
    totalCapUsdc: parseBudget(prompt),
    allowedCategories,
    blockedCategories: blockedCategoriesFor(allowedCategories),
    allowedDomains
  };
}

function intentFromPolicy(prompt: string, policy: SpendPolicy): Ap2StyleIntent {
  return {
    ...DEMO_INTENT,
    userIntent: normalizePromptForDisplay(prompt, policy.totalCapUsdc) || DEMO_INTENT.userIntent,
    maxTotalUsdc: policy.totalCapUsdc,
    allowedCategories: [...policy.allowedCategories],
    allowedDomains: [...policy.allowedDomains]
  };
}

function generatedPolicyFromPolicy(intent: Ap2StyleIntent, policy: SpendPolicy): SafeGeneratedPolicy {
  return {
    policyId: policy.policyId,
    userIntent: intent.userIntent,
    maxTotalUsdc: policy.totalCapUsdc,
    perPaymentCapUsdc: policy.perPaymentCapUsdc,
    allowedCategories: [...policy.allowedCategories],
    blockedCategories: [...policy.blockedCategories],
    allowedDomains: [...policy.allowedDomains],
    piiMode: policy.piiPolicy.mode,
    network: policy.network,
    allowanceAtomicUnits: policy.allowance.remainingAtomicUnits,
    replayWindowSeconds: policy.replayPolicy.idempotencyWindowSeconds
  };
}

function resourceUrl(baseUrl: string | undefined, path: string, requirement: DemoPaymentRequirement): string {
  return baseUrl ? new URL(path, baseUrl).toString() : requirement.extra.resourceUrl;
}

function demoSteps(): DemoStepDefinition[] {
  const taskId = "task_matchday_plan_001";
  const statsRequirement = createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", taskId);

  return [
    {
      id: "match-data",
      label: "match data request",
      resourcePath: "/api/x402/stats",
      requirement: statsRequirement,
      agentReason: "Agent needs live match stats to answer the user."
    },
    {
      id: "transit",
      label: "transit request",
      resourcePath: "/api/x402/transit",
      requirement: createDemoPaymentRequirement("transit-api.demo", "/route/stadium", taskId),
      agentReason: "Agent needs the best stadium route."
    },
    {
      id: "food-voucher",
      label: "food voucher request",
      resourcePath: "/api/x402/food",
      requirement: createDemoPaymentRequirement("food-voucher.demo", "/voucher/halftime", taskId),
      agentReason: "Agent needs a halftime food option."
    },
    {
      id: "official-merch",
      label: "official merch request",
      resourcePath: "/api/x402/official-merch",
      requirement: createDemoPaymentRequirement("official-merch.demo", "/jersey/official", taskId),
      agentReason: "Agent wants an official match-day scarf from the trusted stadium shop."
    },
    {
      id: "blocked-merch",
      label: "merch request",
      resourcePath: "/api/x402/fake-merch",
      requirement: createDemoPaymentRequirement("fake-merch.demo", "/jersey", taskId),
      agentReason: "Agent wants a souvenir jersey, but this merchant is outside the match-day intent."
    },
    {
      id: "duplicate-match-data",
      label: "duplicate match data request",
      resourcePath: "/api/x402/stats",
      requirement: statsRequirement,
      agentReason: "Agent retries the same stats request."
    },
    {
      id: "over-limit-feed",
      label: "premium feed request",
      resourcePath: "/api/x402/premium-feed",
      requirement: withDemoPaymentAmount(createDemoPaymentRequirement("stats-api.demo", "/live/premium-feed", taskId), 0.5),
      agentReason: "Agent requests the premium live feed."
    },
    {
      id: "metadata-redaction",
      label: "metadata leak request",
      resourcePath: "/api/x402/metadata-leak",
      requirement: createDemoPaymentRequirement("stats-api.demo", "/live/metadata-leak", taskId),
      agentReason: "Email marcus@example.com at Hotel Central for shuttle pickup."
    }
  ];
}

function applyAgentReason(request: NormalizedPaymentRequest, agentReason: string): NormalizedPaymentRequest {
  return {
    ...request,
    reason: agentReason.trim() || request.reason
  };
}

async function requirementForStep(step: DemoStepDefinition, baseUrl: string | undefined): Promise<DemoPaymentRequirement> {
  if (!baseUrl) {
    return step.requirement;
  }

  const challenge = await fetchX402ChallengeFromResource(resourceUrl(baseUrl, step.resourcePath, step.requirement));
  return challenge.requirement;
}

async function dryRunStep(
  step: DemoStepDefinition,
  replayGuard: ReplayGuard,
  baseUrl: string | undefined,
  env: SolanaEnv,
  policy: SpendPolicy,
  intent: Ap2StyleIntent
): Promise<SafeDemoRunStep> {
  const requirement = await requirementForStep(step, baseUrl);
  const normalized = normalizePaymentRequirement(requirement);
  const runtimeContext = await prepareRuntimePreflightContext(normalized, policy, env);
  const request = applyAgentReason(runtimeContext.request, step.agentReason);
  const fingerprint = createRequestFingerprint(request);
  const replay = replayGuard.checkAndRemember(
    fingerprint,
    request.rawRequestHash,
    runtimeContext.policy.replayPolicy.idempotencyWindowSeconds
  );
  const decision = evaluatePolicy(request, runtimeContext.policy, intent, replay);
  const displayRequest = decision.sanitizedRequest ?? request;

  return {
    id: step.id,
    label: step.label,
    resourcePath: step.resourcePath,
    resourceUrl: resourceUrl(baseUrl, step.resourcePath, requirement),
    agentReason: displayRequest.reason,
    request: displayRequest,
    decision
  };
}

function hasApprovedAction(decision: PolicyDecision): boolean {
  return decision.action === "approve" || decision.action === "redact_and_approve";
}

async function liveOrDemoStep(
  step: DemoStepDefinition,
  baseUrl: string | undefined,
  env: SolanaEnv,
  replayGuard: ReplayGuard,
  policy: SpendPolicy,
  intent: Ap2StyleIntent
): Promise<SafeDemoRunStep> {
  const requirement = await requirementForStep(step, baseUrl);
  const normalized = normalizePaymentRequirement(requirement);
  const runtimeContext = await prepareRuntimePreflightContext(normalized, policy, env);
  const request = applyAgentReason(runtimeContext.request, step.agentReason);
  const fingerprint = createRequestFingerprint(request);
  const replay = replayGuard.checkAndRemember(
    fingerprint,
    request.rawRequestHash,
    runtimeContext.policy.replayPolicy.idempotencyWindowSeconds
  );
  const decision = evaluatePolicy(request, runtimeContext.policy, intent, replay);
  const displayRequest = decision.sanitizedRequest ?? request;
  const settlement = hasApprovedAction(decision) ? await settleApprovedDecision(decision, env) : undefined;
  const auditRecord = memoryStore.appendAudit(
    createAuditRecord(displayRequest, decision, settlement?.settlementStatus ?? "not_attempted", settlement?.txSignature)
  );

  return {
    id: step.id,
    label: step.label,
    resourcePath: step.resourcePath,
    resourceUrl: resourceUrl(baseUrl, step.resourcePath, requirement),
    agentReason: displayRequest.reason,
    request: displayRequest,
    decision,
    auditRecord,
    settlement,
    explorerUrl: settlement?.explorerUrl
  };
}

function summarize(steps: SafeDemoRunStep[], dryRun: boolean): SafeDemoRunSummary {
  const settledSteps = steps.filter((step) => step.settlement?.settlementStatus === "settled");

  return {
    approved: steps.filter((step) => step.decision.action === "approve").length,
    blocked: steps.filter((step) => step.decision.action === "reject").length,
    redacted: steps.filter((step) => step.decision.action === "redact_and_approve").length,
    settled: settledSteps.length,
    failed: steps.filter((step) => step.settlement?.settlementStatus === "failed").length,
    attemptedSpendUsdc: steps.reduce((total, step) => total + step.request.amountUsdc, 0),
    settledSpendUsdc: settledSteps.reduce((total, step) => total + step.request.amountUsdc, 0),
    auditRecords: steps.filter((step) => step.auditRecord).length,
    dryRun
  };
}

async function assertLiveReady(dryRun: boolean, requireLive: boolean, env: SolanaEnv): Promise<void> {
  if (dryRun || !requireLive) {
    return;
  }

  if (!isLiveSolanaMode(env)) {
    throw new Error("Live SAFE demo requires SAFE_DEMO_MODE=false before devnet spending.");
  }

  if (!hasLiveSignerEnv(env)) {
    throw new Error(
      "Live SAFE demo requires SAFE_USER_SIGNER_BASE58, SAFE_SESSION_SECRET_BASE58, and SAFE_FACILITATOR_SECRET_BASE58."
    );
  }

  const state = await getSafeDemoState(env);

  if (state.liveError) {
    throw new Error(`Live SAFE demo is not ready: ${state.liveError}`);
  }

  if (!state.allowanceStatus?.fixedDelegationExists) {
    throw new Error("Live SAFE demo requires an existing fixed delegation allowance.");
  }
}

export async function runSafeDemo(input: SafeDemoRunInput = {}): Promise<SafeDemoRunRecord> {
  const env = input.env ?? process.env;
  const dryRun = input.dryRun === true;
  const requireLive = input.requireLive ?? !dryRun;
  const prompt = input.prompt?.trim() || DEFAULT_SAFE_DEMO_PROMPT;
  const policy = policyFromPrompt(prompt);
  const intent = intentFromPolicy(prompt, policy);
  const generatedPolicy = generatedPolicyFromPolicy(intent, policy);
  const mode: DemoMode = dryRun ? "dry-run" : isLiveSolanaMode(env) ? "live-devnet" : "demo-settlement";

  await assertLiveReady(dryRun, requireLive, env);

  memoryStore.clearAudit();
  memoryStore.resetReplay();

  const startedAt = new Date().toISOString();
  const replayGuard = new ReplayGuard();
  const steps: SafeDemoRunStep[] = [];

  for (const step of demoSteps()) {
    steps.push(
      dryRun
        ? await dryRunStep(step, replayGuard, input.baseUrl, env, policy, intent)
        : await liveOrDemoStep(step, input.baseUrl, env, replayGuard, policy, intent)
    );
  }

  const run: SafeDemoRunRecord = {
    runId: `demo_${randomUUID()}`,
    startedAt,
    completedAt: new Date().toISOString(),
    prompt: generatedPolicy.userIntent,
    mode,
    generatedPolicy,
    allowance: {
      totalCapUsdc: policy.totalCapUsdc,
      remainingAtomicUnits: policy.allowance.remainingAtomicUnits,
      expiresAt: policy.allowance.expiresAt
    },
    steps,
    summary: summarize(steps, dryRun)
  };

  return memoryStore.appendDemoRun(run);
}
