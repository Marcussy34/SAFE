import packageJson from "../../package.json";
import { DEMO_TOKEN_DECIMALS } from "../../lib/constants";
import { DEMO_POLICY } from "../../lib/fixtures/demoPolicy";
import { MERCHANTS } from "../../lib/fixtures/merchants";
import { deriveDemoAtaLabel, getSolanaRpcUrl, isLiveSolanaMode, redactRpcUrl } from "../../lib/solana/addresses";
import { getDevnetBalances } from "../../lib/solana/liveSettlement";
import { loadLocalEnv } from "./load-local-env";

const INSTALLED_SOLANA_PACKAGES = ["@solana/subscriptions", "@solana/kit", "@solana-program/token"] as const;

function printPackageInfo(): void {
  console.log("Solana package versions:");

  for (const packageName of INSTALLED_SOLANA_PACKAGES) {
    console.log(`- ${packageName}: ${packageJson.dependencies[packageName]}`);
  }
}

function collectMissingLivePrerequisites(): string[] {
  const missing: string[] = [];

  if (!process.env.SAFE_USER_SIGNER_BASE58?.trim()) {
    missing.push("SAFE_USER_SIGNER_BASE58 for the user/delegator signer");
  }

  if (!process.env.SAFE_SESSION_SECRET_BASE58?.trim() && !process.env.SAFE_FACILITATOR_SECRET_BASE58?.trim()) {
    missing.push("SAFE_SESSION_SECRET_BASE58 or SAFE_FACILITATOR_SECRET_BASE58 for the SAFE delegate signer");
  }

  return missing;
}

function throwLivePrerequisiteError(missing: string[]): never {
  throw new Error(
    [
      "Live devnet token setup is prerequisite-gated and did not submit a transaction.",
      "Missing live prerequisites:",
      ...missing.map((item) => `- ${item}`),
      "SAFE_DEMO_MINT points at official devnet USDC. This script does not mint; fund the user wallet externally, then run the balance and allowance scripts."
    ].join("\n")
  );
}

function printDemoValues(): void {
  console.log("Demo token fixture:");
  console.log(`- Mint: ${DEMO_POLICY.allowance.tokenMint}`);
  console.log(`- Decimals: ${DEMO_TOKEN_DECIMALS}`);
  console.log(`- User ATA: ${DEMO_POLICY.allowance.delegatorAta}`);
  console.log(`- Delegatee: ${DEMO_POLICY.allowance.delegatee}`);
  console.log(`- Deterministic demo ATA label: ${deriveDemoAtaLabel(DEMO_POLICY.allowance.delegatee, DEMO_POLICY.allowance.tokenMint)}`);
  console.log("Merchant recipient token accounts:");

  for (const merchant of Object.values(MERCHANTS)) {
    console.log(`- ${merchant.domain}: ${merchant.recipientAta}`);
  }

  console.log("Demo mode only prints fixture values. No devnet transaction was submitted.");
}

async function main(): Promise<void> {
  loadLocalEnv();

  const liveMode = isLiveSolanaMode();
  const rpcUrl = getSolanaRpcUrl();

  console.log("SAFE devnet token setup");
  console.log(`Mode: ${liveMode ? "live" : "demo"}`);
  console.log(`RPC URL: ${redactRpcUrl(rpcUrl)}`);
  printPackageInfo();

  if (liveMode) {
    const missing = collectMissingLivePrerequisites();

    if (missing.length > 0) {
      throwLivePrerequisiteError(missing);
    }

    console.log("Live mode uses official devnet USDC. No mint transaction is submitted by SAFE.");
    console.log("Configured signer balances:");

    for (const balance of await getDevnetBalances()) {
      console.log(`- ${balance.label}: ${balance.sol}, ${balance.usdc}`);
    }

    return;
  }

  printDemoValues();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
