import { createAuditRecord } from "@/lib/audit/auditLog";
import { verifyAllowancePaymentOutcome } from "@/lib/facilitator/facilitatorVerifier";
import {
  createLocalX402PaymentRequirements,
  settleLocalX402Payment,
  verifyLocalX402Payment
} from "@/lib/facilitator/localX402Facilitator";
import { evaluatePolicy } from "@/lib/policy/policyEngine";
import { createRequestFingerprint } from "@/lib/policy/requestFingerprint";
import { isLiveSolanaMode, solanaExplorerTxUrl, type SolanaEnv } from "@/lib/solana/addresses";
import { buildAllowanceBackedPaymentPayload } from "@/lib/solana/allowanceSettlement";
import { buildPublicX402AllowancePayload } from "@/lib/solana/liveSettlement";
import { prepareRuntimePreflightContext } from "@/lib/solana/runtimePreflight";
import { memoryStore } from "@/lib/store/memoryStore";
import type { AuditRecord, NormalizedPaymentRequest, PolicyDecision, SpendPolicy } from "@/lib/types";
import {
  normalizePaymentRequirement,
  type DemoPaymentRequiredBody,
  type DemoPaymentRequirement
} from "@/lib/x402/paymentRequirements";
import type {
  SafeFetchedChallenge,
  SafePaidResourceResult,
  SafePayInput,
  SafePayResult,
  SafePreflightInput,
  SafePreflightResult,
  SafeSettlement
} from "@/lib/safe/types";

const DEMO_TX_SIGNATURE_PREFIX = "demo_sig_";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasApprovedAction(decision: PolicyDecision): boolean {
  return decision.action === "approve" || decision.action === "redact_and_approve";
}

function applyAgentReason(request: NormalizedPaymentRequest, agentReason?: string): NormalizedPaymentRequest {
  const reason = agentReason?.trim();
  return reason ? { ...request, reason } : request;
}

function demoTxSignatureFor(request: NormalizedPaymentRequest): string {
  return `${DEMO_TX_SIGNATURE_PREFIX}${request.rawRequestHash.slice(0, 16)}`;
}

function decodeBase64Json(value: string): unknown {
  return JSON.parse(Buffer.from(value, "base64").toString("utf8")) as unknown;
}

function asDemoPaymentRequirement(value: unknown): DemoPaymentRequirement | null {
  if (!isRecord(value) || value.scheme !== "exact" || !isRecord(value.extra)) {
    return null;
  }

  return value as unknown as DemoPaymentRequirement;
}

function asDemoPaymentRequiredBody(value: unknown): DemoPaymentRequiredBody | null {
  if (!isRecord(value) || !Array.isArray(value.accepts)) {
    return null;
  }

  return value as unknown as DemoPaymentRequiredBody;
}

async function parseJsonBody(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function requirementFromHeaders(response: Response): DemoPaymentRequirement | null {
  const encodedRequirement = response.headers.get("x-safe-demo-accept-payment");

  if (encodedRequirement) {
    return asDemoPaymentRequirement(decodeBase64Json(encodedRequirement));
  }

  const encodedPaymentRequired = response.headers.get("payment-required");

  if (!encodedPaymentRequired) {
    return null;
  }

  const body = asDemoPaymentRequiredBody(decodeBase64Json(encodedPaymentRequired));
  return asDemoPaymentRequirement(body?.accepts[0]);
}

function requirementFromBody(body: unknown): DemoPaymentRequirement | null {
  const paymentRequired = asDemoPaymentRequiredBody(body);
  return asDemoPaymentRequirement(paymentRequired?.accepts[0]);
}

async function fetchPaidResource(resourceUrl: string): Promise<SafePaidResourceResult> {
  const response = await fetch(resourceUrl, {
    cache: "no-store",
    headers: {
      "payment-signature": "safe-demo-settled",
      "x-safe-demo-payment": "settled"
    }
  });

  return {
    url: resourceUrl,
    status: response.status,
    ok: response.ok,
    body: await parseJsonBody(response)
  };
}

async function evaluateRequirement(
  input: SafePreflightInput,
  rememberReplay: boolean,
  env: SolanaEnv
): Promise<SafePreflightResult> {
  const normalized = normalizePaymentRequirement(input.requirement);
  const runtimeContext = await prepareRuntimePreflightContext(normalized, memoryStore.policy, env);
  const request = applyAgentReason(runtimeContext.request, input.agentReason);
  const policy: SpendPolicy = runtimeContext.policy;
  const fingerprint = createRequestFingerprint(request);
  const replay = rememberReplay
    ? await memoryStore.replayStore.checkAndRemember(
        fingerprint,
        request.rawRequestHash,
        policy.replayPolicy.idempotencyWindowSeconds
      )
    : await memoryStore.replayStore.check(fingerprint, request.rawRequestHash);
  const decision = evaluatePolicy(request, policy, memoryStore.intent, replay);

  return { request, decision };
}

export async function fetchX402ChallengeFromResource(resourceUrl: string): Promise<SafeFetchedChallenge> {
  const response = await fetch(resourceUrl, {
    cache: "no-store",
    headers: {
      accept: "application/json"
    }
  });
  const body = await parseJsonBody(response);

  if (response.status !== 402) {
    throw new Error(`Expected x402 402 challenge from ${resourceUrl}, received HTTP ${response.status}.`);
  }

  const paymentRequired = asDemoPaymentRequiredBody(body);
  const requirement = requirementFromHeaders(response) ?? requirementFromBody(body);

  if (!requirement) {
    throw new Error("x402 challenge did not include a demo payment requirement.");
  }

  return {
    resourceUrl,
    status: 402,
    requirement,
    paymentRequired
  };
}

export async function safePreflight(input: SafePreflightInput, env: SolanaEnv = process.env): Promise<SafePreflightResult> {
  return evaluateRequirement(input, false, env);
}

export async function settleApprovedDecision(
  decision: PolicyDecision,
  env: SolanaEnv = process.env
): Promise<SafeSettlement> {
  if (!decision.sanitizedRequest) {
    throw new Error("Approved SAFE decision is missing sanitized request.");
  }

  try {
    if (isLiveSolanaMode(env)) {
      const paymentRequirements = await createLocalX402PaymentRequirements(decision.sanitizedRequest, env);
      const { paymentPayload } = await buildPublicX402AllowancePayload(decision.sanitizedRequest, paymentRequirements, env);
      const verification = await verifyLocalX402Payment(paymentPayload, paymentRequirements, env);

      if (!verification.isValid) {
        return {
          settlementStatus: "failed",
          error: verification.invalidReason ?? "x402_verification_failed"
        };
      }

      // The local facilitator supplies the sponsor signature and submits the x402 payload.
      const settlement = await settleLocalX402Payment(paymentPayload, paymentRequirements, env);

      if (!settlement.success) {
        return {
          settlementStatus: "failed",
          error: settlement.errorReason ?? settlement.errorMessage ?? "x402_settlement_failed"
        };
      }

      return {
        settlementStatus: "settled",
        txSignature: settlement.transaction,
        explorerUrl: solanaExplorerTxUrl(settlement.transaction)
      };
    }

    const payload = buildAllowanceBackedPaymentPayload(decision.sanitizedRequest, env);
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

function appendAudit(request: NormalizedPaymentRequest, decision: PolicyDecision, settlement?: SafeSettlement): AuditRecord {
  return memoryStore.appendAudit(
    createAuditRecord(request, decision, settlement?.settlementStatus ?? "not_attempted", settlement?.txSignature)
  );
}

export async function safePay(input: SafePayInput, env: SolanaEnv = process.env): Promise<SafePayResult> {
  if (!input.requirement && !input.resourceUrl) {
    throw new Error("SAFE pay requires either requirement or resourceUrl.");
  }

  const challenge = input.resourceUrl ? await fetchX402ChallengeFromResource(input.resourceUrl) : undefined;
  const requirement = input.requirement ?? challenge?.requirement;

  if (!requirement) {
    throw new Error("SAFE pay could not resolve a payment requirement.");
  }

  const dryRun = input.dryRun === true;
  const result = await evaluateRequirement({ requirement, agentReason: input.agentReason }, !dryRun, env);
  let settlement: SafeSettlement | undefined;
  let auditRecord: AuditRecord | undefined;
  let resource: SafePaidResourceResult | undefined;
  const auditRequest = result.decision.sanitizedRequest ?? result.request;

  if (hasApprovedAction(result.decision) && !dryRun) {
    settlement = await settleApprovedDecision(result.decision, env);
  }

  if (!dryRun) {
    auditRecord = appendAudit(auditRequest, result.decision, settlement);
  }

  if (settlement?.settlementStatus === "settled" && challenge?.resourceUrl) {
    resource = await fetchPaidResource(challenge.resourceUrl);
  }

  return {
    ...result,
    dryRun,
    auditRecord,
    settlement,
    explorerUrl: settlement?.explorerUrl,
    resource
  };
}
