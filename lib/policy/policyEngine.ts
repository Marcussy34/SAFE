import { scanAndRedactPii } from "@/lib/policy/piiScanner";
import { MERCHANTS } from "@/lib/fixtures/merchants";
import type { Ap2StyleIntent, NormalizedPaymentRequest, PolicyDecision, SpendPolicy } from "@/lib/types";

interface ReplayInput {
  duplicate: boolean;
  duplicateFingerprint?: boolean;
}

function reject(reasonCode: string, reason: string, riskScore: number): PolicyDecision {
  return {
    action: "reject",
    reasonCode,
    reason,
    riskScore,
    requiresUserAction: false,
    x402PaymentStatus: "not_signed"
  };
}

function isExpired(isoDate: string, nowMs: number) {
  const timestamp = Date.parse(isoDate);
  return Number.isNaN(timestamp) || timestamp <= nowMs;
}

function hasEnoughAllowance(amountAtomicUnits: string, remainingAtomicUnits: string) {
  try {
    return BigInt(amountAtomicUnits) <= BigInt(remainingAtomicUnits);
  } catch {
    return false;
  }
}

function redactRequest(request: NormalizedPaymentRequest): NormalizedPaymentRequest {
  return {
    ...request,
    resourceUrl: scanAndRedactPii(request.resourceUrl).redactedText,
    description: scanAndRedactPii(request.description).redactedText,
    reason: scanAndRedactPii(request.reason).redactedText,
    x402: {
      ...request.x402,
      memo: request.x402.memo ? scanAndRedactPii(request.x402.memo).redactedText : request.x402.memo
    }
  };
}

export function evaluatePolicy(
  request: NormalizedPaymentRequest,
  policy: SpendPolicy,
  intent: Ap2StyleIntent,
  replay: ReplayInput
): PolicyDecision {
  const nowMs = Date.now();

  if (isExpired(policy.expiresAt, nowMs)) {
    return reject("POLICY_EXPIRED", "The spend policy has expired.", 0.9);
  }

  if (isExpired(policy.allowance.expiresAt, nowMs)) {
    return reject("ALLOWANCE_EXPIRED", "The delegated allowance has expired.", 0.9);
  }

  if (isExpired(intent.expiresAt, nowMs) || request.intentId !== intent.intentId || policy.ap2StyleIntentId !== intent.intentId) {
    return reject("INTENT_SCOPE_MISMATCH", "The payment does not match the AP2-style intent scope.", 0.76);
  }

  if (!policy.allowedRails.includes(request.rail)) {
    return reject("RAIL_NOT_ALLOWED", "The payment rail is not allowed by policy.", 0.7);
  }

  if (request.scheme !== "exact") {
    return reject("SCHEME_NOT_ALLOWED", "The x402 scheme is not allowed by policy.", 0.75);
  }

  if (request.network !== policy.network) {
    return reject("NETWORK_MISMATCH", "The payment network does not match policy.", 0.75);
  }

  if (!policy.allowedTokens.includes(request.token) || request.assetMint !== policy.allowance.tokenMint) {
    return reject("TOKEN_NOT_ALLOWED", "The requested payment token is not allowed by policy.", 0.74);
  }

  if (request.amountUsdc > policy.perPaymentCapUsdc) {
    return reject("AMOUNT_OVER_PER_PAYMENT_CAP", "The requested payment exceeds the per-payment cap.", 0.8);
  }

  if (!hasEnoughAllowance(request.amountAtomicUnits, policy.allowance.remainingAtomicUnits)) {
    return reject("ALLOWANCE_CAP_EXCEEDED", "The allowance does not have enough remaining capacity.", 0.9);
  }

  if (!policy.allowedDomains.includes(request.merchantDomain)) {
    return reject("MERCHANT_NOT_ALLOWLISTED", `${request.merchantDomain} is not allowlisted.`, 0.82);
  }

  const merchant = MERCHANTS[request.merchantDomain];
  if (!merchant || merchant.trustStatus !== "trusted_demo") {
    return reject("MERCHANT_NOT_ALLOWLISTED", `${request.merchantDomain} is not a trusted merchant.`, 0.82);
  }

  if (
    request.recipientAddress !== merchant.recipientAddress ||
    request.x402.payTo !== merchant.recipientAddress ||
    request.recipientAta !== merchant.recipientAta
  ) {
    return reject("RECIPIENT_MISMATCH", "The x402 recipient does not match the trusted merchant registry.", 0.88);
  }

  if (
    request.allowanceSettlement.delegatee !== policy.allowance.delegatee ||
    request.allowanceSettlement.delegationPda !== policy.allowance.delegationPda ||
    request.allowanceSettlement.delegationType !== policy.allowance.type
  ) {
    return reject("ALLOWANCE_DELEGATION_MISMATCH", "The settlement delegation does not match the active allowance.", 0.88);
  }

  if (policy.blockedCategories.includes(request.category) || !policy.allowedCategories.includes(request.category)) {
    return reject("CATEGORY_NOT_ALLOWED", `${request.category} is not allowed for this agent session.`, 0.78);
  }

  if (!intent.allowedDomains.includes(request.merchantDomain) || !intent.allowedCategories.includes(request.category)) {
    return reject("INTENT_SCOPE_MISMATCH", "The payment does not match the AP2-style intent scope.", 0.76);
  }

  if (replay.duplicate) {
    return reject("DUPLICATE_PAYMENT_REQUEST", "This payment request was already approved or evaluated recently.", 0.71);
  }

  if (policy.replayPolicy.blockDuplicateResourceRequest && replay.duplicateFingerprint) {
    return reject("DUPLICATE_RESOURCE_REQUEST", "This paid resource was already requested recently.", 0.69);
  }

  const pii = scanAndRedactPii(`${request.resourceUrl} ${request.description} ${request.reason} ${request.x402.memo ?? ""}`);
  if (pii.detected && policy.piiPolicy.mode === "block") {
    return reject("PII_BLOCKED", "Sensitive metadata was detected and policy requires blocking.", 0.85);
  }

  if (pii.detected) {
    return {
      action: "redact_and_approve",
      approvedAmountUsdc: request.amountUsdc,
      reasonCode: "PII_REDACTED",
      reason: "Sensitive metadata was redacted before payment signing.",
      riskScore: 0.22,
      sanitizedRequest: redactRequest(request),
      requiresUserAction: false,
      x402PaymentStatus: "not_signed"
    };
  }

  return {
    action: "approve",
    approvedAmountUsdc: request.amountUsdc,
    reasonCode: "POLICY_OK",
    reason: "Allowed merchant, category, amount, intent, and metadata.",
    riskScore: 0.08,
    sanitizedRequest: request,
    requiresUserAction: false,
    x402PaymentStatus: "not_signed"
  };
}
