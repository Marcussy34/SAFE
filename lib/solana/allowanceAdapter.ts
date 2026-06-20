import { DEMO_POLICY } from "@/lib/fixtures/demoPolicy";
import type { AllowanceDelegation } from "@/lib/types";
import { getSolanaRpcUrl, isLiveSolanaMode, solanaExplorerTxUrl, type SolanaEnv } from "@/lib/solana/addresses";

export interface AllowanceState {
  allowance: AllowanceDelegation;
  liveMode: boolean;
  rpcUrl: string;
  explorerUrl?: string;
}

export async function getAllowanceState(env: SolanaEnv = process.env): Promise<AllowanceState> {
  const signature = env.SAFE_DEMO_ALLOWANCE_SIGNATURE?.trim();
  const cluster = env.NEXT_PUBLIC_SOLANA_CLUSTER?.trim() || "devnet";

  return {
    allowance: DEMO_POLICY.allowance,
    liveMode: isLiveSolanaMode(env),
    rpcUrl: getSolanaRpcUrl(env),
    ...(signature ? { explorerUrl: solanaExplorerTxUrl(signature, cluster) } : {})
  };
}
