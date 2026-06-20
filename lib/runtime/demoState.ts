import { getSafeReadiness, type SafeReadiness } from "@/lib/runtime/readiness";
import { getDevnetBalances, getLiveAllowanceContext, hasLiveSignerEnv, type DevnetBalanceRow } from "@/lib/solana/liveSettlement";
import type { SolanaEnv } from "@/lib/solana/addresses";
import { getWalletAllowanceStatus, type WalletAllowanceStatus } from "@/lib/solana/walletAllowanceSetup";
import { memoryStore } from "@/lib/store/memoryStore";
import type { AuditRecord } from "@/lib/types";

export interface SafeDemoState {
  generatedAt: string;
  readiness: SafeReadiness;
  liveSignersConfigured: boolean;
  balances: DevnetBalanceRow[];
  allowanceStatus?: WalletAllowanceStatus;
  liveError?: string;
  audit: AuditRecord[];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unable to load live demo state.";
}

export async function getSafeDemoState(env: SolanaEnv = process.env): Promise<SafeDemoState> {
  const readiness = await getSafeReadiness(env);
  const liveSignersConfigured = hasLiveSignerEnv(env);
  let balances: DevnetBalanceRow[] = [];
  let allowanceStatus: WalletAllowanceStatus | undefined;
  let liveError: string | undefined;

  if (liveSignersConfigured) {
    try {
      const context = await getLiveAllowanceContext(env);
      const [balanceRows, status] = await Promise.all([
        getDevnetBalances(env),
        getWalletAllowanceStatus(context.userSigner.address, env)
      ]);

      balances = balanceRows;
      allowanceStatus = status;
    } catch (error) {
      // Return a 200 state response without ever exposing signer material.
      liveError = errorMessage(error);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    readiness,
    liveSignersConfigured,
    balances,
    allowanceStatus,
    liveError,
    audit: memoryStore.listAudit()
  };
}
