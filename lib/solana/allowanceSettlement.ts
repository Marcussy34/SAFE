import { isLiveSolanaMode, type SolanaEnv } from "@/lib/solana/addresses";
import type { NormalizedPaymentRequest, X402AllowancePayload } from "@/lib/types";
import { createDemoX402AllowancePayload } from "@/lib/x402/x402Payload";

export const LIVE_SETTLEMENT_PREREQUISITE_ERROR = [
  "Live Solana allowance settlement is handled by the @solana/subscriptions transferFixed path, not by the demo payload verifier.",
  "Use settleLiveAllowancePayment for devnet transaction submission, or set SAFE_DEMO_MODE=true for the mock x402 verifier."
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
