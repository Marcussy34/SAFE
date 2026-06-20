import packageJson from "../../package.json";
import { DEMO_POLICY } from "../../lib/fixtures/demoPolicy";
import { getAllowanceState } from "../../lib/solana/allowanceAdapter";
import { getSolanaRpcUrl, isLiveSolanaMode, redactRpcUrl } from "../../lib/solana/addresses";
import { setupFixedAllowance, SUBSCRIPTIONS_PROGRAM_FOR_SAFE } from "../../lib/solana/liveSettlement";
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

  if (!process.env.SAFE_SESSION_SECRET_BASE58?.trim()) {
    missing.push("SAFE_SESSION_SECRET_BASE58 for the SAFE delegate signer");
  }

  if (!process.env.SAFE_FACILITATOR_SECRET_BASE58?.trim()) {
    missing.push("SAFE_FACILITATOR_SECRET_BASE58 for the transaction sponsor");
  }

  if (!process.env.SAFE_DEMO_MINT?.trim()) {
    missing.push("SAFE_DEMO_MINT for the token mint to delegate");
  }

  return missing;
}

function throwLivePrerequisiteError(missing: string[]): never {
  throw new Error(
    [
      "Live fixed allowance setup is prerequisite-gated and did not submit a transaction.",
      "Missing live prerequisites:",
      ...missing.map((item) => `- ${item}`),
      "Required path: load user, delegatee, and sponsor signer material from env, then call initSubscriptionAuthority and createFixedDelegation with @solana/subscriptions. Amounts must be base units."
    ].join("\n")
  );
}

async function printDemoValues(): Promise<void> {
  const state = await getAllowanceState();

  console.log("Demo fixed allowance fixture:");
  console.log(`- Type: ${state.allowance.type}`);
  console.log(`- Token mint: ${state.allowance.tokenMint}`);
  console.log(`- Subscription authority PDA: ${state.allowance.subscriptionAuthorityPda}`);
  console.log(`- Fixed delegation PDA: ${state.allowance.delegationPda}`);
  console.log(`- Delegator ATA: ${state.allowance.delegatorAta}`);
  console.log(`- Delegatee: ${state.allowance.delegatee}`);
  console.log(`- Remaining atomic units: ${state.allowance.remainingAtomicUnits}`);
  console.log(`- Expires at: ${state.allowance.expiresAt}`);
  console.log(`- Policy allowance object matches demo policy: ${state.allowance === DEMO_POLICY.allowance ? "yes" : "no"}`);

  if (state.explorerUrl) {
    console.log(`- Demo allowance explorer URL: ${state.explorerUrl}`);
  }

  console.log("Demo mode only prints fixture values. No devnet transaction was submitted.");
}

async function main(): Promise<void> {
  loadLocalEnv();

  const liveMode = isLiveSolanaMode();
  const rpcUrl = getSolanaRpcUrl();

  console.log("SAFE fixed allowance setup");
  console.log(`Mode: ${liveMode ? "live" : "demo"}`);
  console.log(`RPC URL: ${redactRpcUrl(rpcUrl)}`);
  printPackageInfo();

  if (liveMode) {
    const missing = collectMissingLivePrerequisites();

    if (missing.length > 0) {
      throwLivePrerequisiteError(missing);
    }

    const result = await setupFixedAllowance();

    console.log("Live fixed allowance:");
    console.log(`- Program: ${SUBSCRIPTIONS_PROGRAM_FOR_SAFE}`);
    console.log(`- Token mint: ${result.mint}`);
    console.log(`- Subscription authority PDA: ${result.subscriptionAuthorityPda}`);
    console.log(`- Fixed delegation PDA: ${result.fixedDelegationPda}`);
    console.log(`- Delegator ATA: ${result.delegatorAta}`);
    console.log(`- Delegatee: ${result.delegatee}`);
    console.log(`- initSubscriptionAuthority: ${result.skippedInit ? "already initialized" : result.initSignature}`);
    console.log(`- createFixedDelegation: ${result.skippedCreate ? "already exists" : result.createSignature}`);

    if (result.initExplorerUrl) {
      console.log(`- Init explorer URL: ${result.initExplorerUrl}`);
    }

    if (result.createExplorerUrl) {
      console.log(`- Delegation explorer URL: ${result.createExplorerUrl}`);
    }

    return;
  }

  await printDemoValues();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
