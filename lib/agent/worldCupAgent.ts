import { createAuditRecord } from "@/lib/audit/auditLog";
import { usdcToAtomicUnits } from "@/lib/constants";
import { verifyAllowancePaymentOutcome } from "@/lib/facilitator/facilitatorVerifier";
import { evaluatePolicy } from "@/lib/policy/policyEngine";
import { createRequestFingerprint } from "@/lib/policy/requestFingerprint";
import { solanaExplorerTxUrl } from "@/lib/solana/addresses";
import { buildAllowanceBackedPaymentPayload } from "@/lib/solana/allowanceSettlement";
import { memoryStore } from "@/lib/store/memoryStore";
import type { AuditRecord, NormalizedPaymentRequest, PolicyDecision } from "@/lib/types";
import { createDemoPaymentRequirement, normalizePaymentRequirement, type DemoPaymentRequirement } from "@/lib/x402/paymentRequirements";

interface AgentSettlement {
  settlementStatus: "settled" | "failed";
  txSignature?: string;
  explorerUrl?: string;
  error?: string;
}

export interface AgentAttempt {
  label: string;
  request: NormalizedPaymentRequest;
  decision: PolicyDecision;
  auditRecord: AuditRecord;
  settlement?: AgentSettlement;
}

export interface WorldCupAgentResult {
  attempts: AgentAttempt[];
  audit: AuditRecord[];
}

const TASK_ID = "task_matchday_plan_001";
const DEMO_TX_SIGNATURE_PREFIX = "demo_sig_";

function withAmount(requirement: DemoPaymentRequirement, amountUsdc: number): DemoPaymentRequirement {
  return {
    ...requirement,
    amount: usdcToAtomicUnits(amountUsdc),
    extra: {
      ...requirement.extra,
      amountUsdc
    }
  };
}

function requiresSettlement(decision: PolicyDecision): boolean {
  return decision.action === "approve" || decision.action === "redact_and_approve";
}

function demoTxSignatureFor(request: NormalizedPaymentRequest): string {
  return `${DEMO_TX_SIGNATURE_PREFIX}${request.rawRequestHash.slice(0, 16)}`;
}

async function settleApprovedDecision(decision: PolicyDecision): Promise<AgentSettlement> {
  if (!decision.sanitizedRequest) {
    throw new Error("Approved SAFE decision is missing sanitized request.");
  }

  try {
    const payload = buildAllowanceBackedPaymentPayload(decision.sanitizedRequest);
    const verification = verifyAllowancePaymentOutcome(payload, decision.sanitizedRequest);

    if (!verification.valid) {
      return { settlementStatus: "failed", error: verification.reasonCode };
    }

    const txSignature = demoTxSignatureFor(decision.sanitizedRequest);

    return {
      settlementStatus: "settled",
      txSignature,
      explorerUrl: solanaExplorerTxUrl(txSignature)
    };
  } catch (error) {
    return {
      settlementStatus: "failed",
      error: error instanceof Error ? error.message : "Settlement failed."
    };
  }
}

async function evaluateAttempt(
  label: string,
  requirement: DemoPaymentRequirement,
  mutate?: (request: NormalizedPaymentRequest) => NormalizedPaymentRequest
): Promise<AgentAttempt> {
  const normalized = normalizePaymentRequirement(requirement);
  const request = mutate ? mutate(normalized) : normalized;
  const replay = memoryStore.replayGuard.checkAndRemember(
    createRequestFingerprint(request),
    request.rawRequestHash,
    memoryStore.policy.replayPolicy.idempotencyWindowSeconds
  );
  const decision = evaluatePolicy(request, memoryStore.policy, memoryStore.intent, replay);
  const settlement = requiresSettlement(decision) ? await settleApprovedDecision(decision) : undefined;
  const auditRequest = decision.sanitizedRequest ?? request;
  const auditRecord = memoryStore.appendAudit(
    createAuditRecord(auditRequest, decision, settlement?.settlementStatus ?? "not_attempted", settlement?.txSignature)
  );

  return {
    label,
    request: auditRequest,
    decision,
    auditRecord,
    settlement
  };
}

export async function runWorldCupAgentScenario(): Promise<WorldCupAgentResult> {
  memoryStore.clearAudit();
  memoryStore.resetReplay();

  const statsRequirement = createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", TASK_ID);
  const foodRequirement = createDemoPaymentRequirement("food-voucher.demo", "/voucher/halftime", TASK_ID);
  const overLimitRequirement = withAmount(createDemoPaymentRequirement("stats-api.demo", "/live/premium-feed", TASK_ID), 0.5);
  const piiRequirement = createDemoPaymentRequirement("stats-api.demo", "/live/metadata-leak", TASK_ID);

  const attempts = [
    await evaluateAttempt("POLICY_OK approved stats", statsRequirement),
    await evaluateAttempt("POLICY_OK approved transit", createDemoPaymentRequirement("transit-api.demo", "/route/stadium", TASK_ID)),
    await evaluateAttempt("POLICY_OK approved food voucher", foodRequirement),
    await evaluateAttempt("MERCHANT_NOT_ALLOWLISTED blocked fake merch", createDemoPaymentRequirement("fake-merch.demo", "/jersey", TASK_ID)),
    await evaluateAttempt("DUPLICATE_PAYMENT_REQUEST blocked duplicate stats", statsRequirement),
    await evaluateAttempt("AMOUNT_OVER_PER_PAYMENT_CAP blocked over-limit request", overLimitRequirement),
    await evaluateAttempt("PII_REDACTED redacted metadata leak", piiRequirement, (request) => ({
      ...request,
      reason: "Email marcus@example.com at Hotel Central for shuttle pickup."
    }))
  ];

  return {
    attempts,
    audit: memoryStore.listAudit()
  };
}
