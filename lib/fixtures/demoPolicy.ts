import {
  DEMO_DELEGATOR_ATA,
  DEMO_EXPIRES_AT,
  DEMO_FIXED_DELEGATION_PDA,
  DEMO_MINT_PLACEHOLDER,
  SAFE_SESSION_SIGNER_PLACEHOLDER,
  DEMO_SUBSCRIPTION_AUTHORITY_PDA,
  SOLANA_DEVNET_CHAIN_ID
} from "@/lib/constants";
import type { Ap2StyleIntent, SpendPolicy } from "@/lib/types";

export const DEMO_INTENT: Ap2StyleIntent = {
  intentId: "intent_wc_matchday_001",
  userIntent: "Plan my World Cup match day",
  maxTotalUsdc: 5,
  allowedDomains: ["stats-api.demo", "transit-api.demo", "food-voucher.demo"],
  allowedCategories: ["match_data", "transit", "food_voucher"],
  expiresAt: DEMO_EXPIRES_AT
};

export const DEMO_POLICY: SpendPolicy = {
  policyId: "pol_wc_matchday_001",
  scope: "world_cup_matchday",
  network: SOLANA_DEVNET_CHAIN_ID,
  totalCapUsdc: 5,
  perPaymentCapUsdc: 0.1,
  perMerchantCapUsdc: 1,
  expiresAt: DEMO_EXPIRES_AT,
  allowedRails: ["x402_solana_allowance_devnet"],
  allowedTokens: ["DEMO_USD", "USDC", "USDG"],
  allowedCategories: ["match_data", "transit", "food_voucher"],
  blockedCategories: ["gambling", "merch", "unknown"],
  allowedDomains: DEMO_INTENT.allowedDomains,
  requireHumanApprovalAboveUsdc: 1,
  piiPolicy: {
    mode: "redact_or_block",
    blockedEntities: ["email", "phone", "passport", "hotel", "wallet_address", "government_id", "credit_card"]
  },
  replayPolicy: {
    idempotencyWindowSeconds: 300,
    blockDuplicatePaymentHash: true,
    blockDuplicateResourceRequest: true
  },
  allowance: {
    type: "fixed",
    delegationPda: DEMO_FIXED_DELEGATION_PDA,
    subscriptionAuthorityPda: DEMO_SUBSCRIPTION_AUTHORITY_PDA,
    delegatee: SAFE_SESSION_SIGNER_PLACEHOLDER,
    delegatorAta: DEMO_DELEGATOR_ATA,
    tokenMint: DEMO_MINT_PLACEHOLDER,
    remainingAtomicUnits: "5000000",
    expiresAt: DEMO_EXPIRES_AT
  },
  ap2StyleIntentId: DEMO_INTENT.intentId
};
