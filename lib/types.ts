export type DecisionAction =
  | "approve"
  | "reject"
  | "redact_and_approve"
  | "ask_human"
  | "update_allowance_required";

export type PaymentRail = "x402_solana_allowance_devnet";
export type PaymentScheme = "exact";
export type DemoToken = "DEMO_USD" | "USDC" | "USDG";
export type MerchantCategory = "match_data" | "transit" | "food_voucher" | "merch" | "gambling" | "unknown";

export interface MerchantRegistryEntry {
  merchantId: string;
  domain: string;
  displayName: string;
  category: MerchantCategory;
  recipientAddress: string;
  recipientAta: string;
  tokenMint: string;
  maxExpectedPriceUsdc: number;
  trustStatus: "trusted_demo" | "blocked";
}

export interface AllowanceDelegation {
  type: "fixed" | "recurring";
  delegationPda: string;
  subscriptionAuthorityPda: string;
  delegatee: string;
  delegatorAta: string;
  tokenMint: string;
  remainingAtomicUnits: string;
  expiresAt: string;
}

export interface SpendPolicy {
  policyId: string;
  scope: string;
  network: string;
  totalCapUsdc: number;
  perPaymentCapUsdc: number;
  perMerchantCapUsdc: number;
  expiresAt: string;
  allowedRails: PaymentRail[];
  allowedTokens: DemoToken[];
  allowedCategories: MerchantCategory[];
  blockedCategories: MerchantCategory[];
  allowedDomains: string[];
  requireHumanApprovalAboveUsdc: number;
  piiPolicy: {
    mode: "block" | "redact_or_block";
    blockedEntities: string[];
  };
  replayPolicy: {
    idempotencyWindowSeconds: number;
    blockDuplicatePaymentHash: boolean;
    blockDuplicateResourceRequest: boolean;
  };
  allowance: AllowanceDelegation;
  ap2StyleIntentId: string;
}

export interface Ap2StyleIntent {
  intentId: string;
  userIntent: string;
  maxTotalUsdc: number;
  allowedDomains: string[];
  allowedCategories: MerchantCategory[];
  expiresAt: string;
  signature?: string;
}

export interface NormalizedPaymentRequest {
  requestId: string;
  rail: PaymentRail;
  scheme: PaymentScheme;
  network: string;
  amountUsdc: number;
  amountAtomicUnits: string;
  token: DemoToken;
  assetMint: string;
  recipientAddress: string;
  recipientAta: string;
  merchantDomain: string;
  merchantName: string;
  category: MerchantCategory;
  resourceUrl: string;
  description: string;
  reason: string;
  rawRequestHash: string;
  taskId: string;
  intentId: string;
  userIntent: string;
  x402: {
    paymentRequiredStatus: 402;
    payTo: string;
    feePayer: string;
    memo?: string;
    facilitatorUrl: string;
    paymentHeader?: string;
  };
  allowanceSettlement: {
    delegationType: "fixed" | "recurring";
    delegationPda: string;
    instruction: "transferFixed" | "transferRecurring";
    delegatee: string;
  };
}

export interface PolicyDecision {
  action: DecisionAction;
  approvedAmountUsdc?: number;
  reasonCode: string;
  reason: string;
  riskScore: number;
  sanitizedRequest?: NormalizedPaymentRequest;
  requiresUserAction: boolean;
  x402PaymentStatus?: "not_signed" | "signed" | "settled" | "settle_failed";
}

export interface AuditRecord {
  auditId: string;
  timestamp: string;
  policyId: string;
  paymentRequestHash: string;
  merchantDomain: string;
  amountUsdc: number;
  decision: DecisionAction;
  reasonCode: string;
  piiDetected: boolean;
  duplicateDetected: boolean;
  settlementStatus: "not_attempted" | "verified" | "settled" | "failed";
  txSignature?: string;
}

export interface X402AllowancePayload {
  x402Version: 2;
  accepted: {
    scheme: "exact";
    network: string;
    amount: string;
    asset: string;
    payTo: string;
    extra: {
      feePayer: string;
      memo?: string;
    };
  };
  payload: {
    transaction: string;
  };
}

export interface AllowanceVerificationResult {
  valid: boolean;
  reasonCode: string;
  matchingTransferCount: number;
  innerTransferVerified: boolean;
  txSignature?: string;
}
