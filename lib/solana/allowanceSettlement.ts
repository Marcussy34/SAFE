import { isLiveSolanaMode, type SolanaEnv } from "@/lib/solana/addresses";
import type { NormalizedPaymentRequest, X402AllowancePayload } from "@/lib/types";
import { createDemoX402AllowancePayload } from "@/lib/x402/x402Payload";

export const LIVE_SETTLEMENT_PREREQUISITE_ERROR = [
  "Live Solana allowance settlement is prerequisite-gated and did not submit a transaction.",
  "Set SAFE_DEMO_MODE=false only after adding the required @solana/kit RPC/signer plugin setup, loading user and SAFE delegate signer material from env, and wiring @solana/subscriptions transferFixed for the allowance flow."
].join(" ");

export function buildAllowanceBackedPaymentPayload(
  request: NormalizedPaymentRequest,
  env: SolanaEnv = process.env
): X402AllowancePayload {
  if (isLiveSolanaMode(env)) {
    throw new Error(LIVE_SETTLEMENT_PREREQUISITE_ERROR);
  }

  return createDemoX402AllowancePayload(request);
}
