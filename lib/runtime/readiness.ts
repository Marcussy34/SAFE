import { createSolanaRpc } from "@solana/kit";
import { DEMO_MINT_PLACEHOLDER, SOLANA_DEVNET_CHAIN_ID } from "@/lib/constants";
import { getLocalX402FeePayer } from "@/lib/facilitator/localX402Facilitator";
import { getSolanaRpcUrl, isLiveSolanaMode, redactRpcUrl, type SolanaEnv } from "@/lib/solana/addresses";
import { hasLiveSignerEnv, SUBSCRIPTIONS_PROGRAM_FOR_SAFE } from "@/lib/solana/liveSettlement";

export interface ReadinessCheck {
  id: string;
  label: string;
  ok: boolean;
  detail: string;
}

export interface SafeReadiness {
  mode: "demo" | "live-devnet";
  network: string;
  rpcUrl: string;
  mint: string;
  subscriptionsProgram: string;
  localFacilitator: {
    enabled: boolean;
    feePayer?: string;
  };
  checks: ReadinessCheck[];
}

async function rpcReachable(env: SolanaEnv): Promise<ReadinessCheck> {
  try {
    const rpc = createSolanaRpc(getSolanaRpcUrl(env));
    const genesisHash = await rpc.getGenesisHash().send();

    return {
      id: "rpc",
      label: "Solana RPC",
      ok: true,
      detail: `Connected to ${genesisHash.slice(0, 8)}...`
    };
  } catch {
    return {
      id: "rpc",
      label: "Solana RPC",
      ok: false,
      detail: "RPC is not reachable from the server."
    };
  }
}

async function localFacilitatorCheck(env: SolanaEnv): Promise<{
  check: ReadinessCheck;
  feePayer?: string;
}> {
  if (!env.SAFE_FACILITATOR_SECRET_BASE58?.trim()) {
    return {
      check: {
        id: "facilitator",
        label: "Local x402 facilitator",
        ok: false,
        detail: "Missing SAFE_FACILITATOR_SECRET_BASE58."
      }
    };
  }

  try {
    const feePayer = await getLocalX402FeePayer(env);

    return {
      feePayer,
      check: {
        id: "facilitator",
        label: "Local x402 facilitator",
        ok: true,
        detail: `Fee payer ${feePayer}`
      }
    };
  } catch (error) {
    return {
      check: {
        id: "facilitator",
        label: "Local x402 facilitator",
        ok: false,
        detail: error instanceof Error ? error.message : "Unable to initialize local facilitator."
      }
    };
  }
}

export async function getSafeReadiness(env: SolanaEnv = process.env): Promise<SafeReadiness> {
  const liveMode = isLiveSolanaMode(env);
  const [rpc, facilitator] = await Promise.all([rpcReachable(env), localFacilitatorCheck(env)]);
  const checks: ReadinessCheck[] = [
    {
      id: "mode",
      label: "Runtime mode",
      ok: true,
      detail: liveMode ? "Live devnet settlement is enabled." : "Demo mode is enabled."
    },
    rpc,
    {
      id: "agent-signer",
      label: "Agent delegatee signer",
      ok: Boolean(env.SAFE_SESSION_SECRET_BASE58?.trim()),
      detail: env.SAFE_SESSION_SECRET_BASE58?.trim()
        ? "SAFE_SESSION_SECRET_BASE58 is configured."
        : "Missing SAFE_SESSION_SECRET_BASE58."
    },
    facilitator.check,
    {
      id: "live-signers",
      label: "Legacy env live signers",
      ok: hasLiveSignerEnv(env),
      detail: hasLiveSignerEnv(env)
        ? "Legacy env-based smoke scripts can run."
        : "Wallet setup does not require SAFE_USER_SIGNER_BASE58, but old smoke scripts do."
    }
  ];

  return {
    mode: liveMode ? "live-devnet" : "demo",
    network: env.NEXT_PUBLIC_SOLANA_CLUSTER || SOLANA_DEVNET_CHAIN_ID,
    rpcUrl: redactRpcUrl(getSolanaRpcUrl(env)),
    mint: env.SAFE_DEMO_MINT?.trim() || DEMO_MINT_PLACEHOLDER,
    subscriptionsProgram: SUBSCRIPTIONS_PROGRAM_FOR_SAFE,
    localFacilitator: {
      enabled: facilitator.check.ok,
      feePayer: facilitator.feePayer
    },
    checks
  };
}
