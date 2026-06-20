import { isLiveSolanaMode, type SolanaEnv } from "@/lib/solana/addresses";
import { applyLiveAllowanceToRequest, hasLiveSignerEnv, livePolicyFromContext } from "@/lib/solana/liveSettlement";
import type { NormalizedPaymentRequest, SpendPolicy } from "@/lib/types";

export interface RuntimePreflightContext {
  request: NormalizedPaymentRequest;
  policy: SpendPolicy;
}

export async function prepareRuntimePreflightContext(
  request: NormalizedPaymentRequest,
  policy: SpendPolicy,
  env: SolanaEnv = process.env
): Promise<RuntimePreflightContext> {
  if (!isLiveSolanaMode(env) || !hasLiveSignerEnv(env)) {
    return { request, policy };
  }

  const liveRequest = await applyLiveAllowanceToRequest(request, env);
  const livePolicy = await livePolicyFromContext(policy, env);

  return {
    request: liveRequest,
    policy: livePolicy
  };
}
