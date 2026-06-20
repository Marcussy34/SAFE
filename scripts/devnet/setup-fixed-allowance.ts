import packageJson from "../../package.json";
import { DEMO_POLICY } from "../../lib/fixtures/demoPolicy";
import { getAllowanceState } from "../../lib/solana/allowanceAdapter";
import { getSolanaRpcUrl, isLiveSolanaMode, redactRpcUrl } from "../../lib/solana/addresses";

const INSTALLED_SOLANA_PACKAGES = ["@solana/subscriptions", "@solana/kit", "@solana-program/token"] as const;
const LIVE_PLUGIN_PACKAGES = ["@solana/kit-plugin-rpc", "@solana/kit-plugin-signer"] as const;

function hasDependency(packageName: string): boolean {
  return Object.keys(packageJson.dependencies).includes(packageName);
}

function printPackageInfo(): void {
  console.log("Solana package versions:");

  for (const packageName of INSTALLED_SOLANA_PACKAGES) {
    console.log(`- ${packageName}: ${packageJson.dependencies[packageName]}`);
  }

  console.log("Live transaction writer packages:");

  for (const packageName of LIVE_PLUGIN_PACKAGES) {
    console.log(`- ${packageName}: ${hasDependency(packageName) ? "present" : "missing"}`);
  }
}

function collectMissingLivePrerequisites(): string[] {
  const missing = LIVE_PLUGIN_PACKAGES.filter((packageName) => !hasDependency(packageName)).map(
    (packageName) => `${packageName} dependency`
  );

  if (!process.env.SAFE_USER_SIGNER_BASE58?.trim()) {
    missing.push("SAFE_USER_SIGNER_BASE58 for the user/delegator signer");
  }

  if (!process.env.SAFE_SESSION_SECRET_BASE58?.trim() && !process.env.SAFE_FACILITATOR_SECRET_BASE58?.trim()) {
    missing.push("SAFE_SESSION_SECRET_BASE58 or SAFE_FACILITATOR_SECRET_BASE58 for the SAFE delegate signer");
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
      "Required path: create a @solana/kit client with @solana/kit-plugin-rpc and @solana/kit-plugin-signer, load the user signer from env, call initSubscriptionAuthority when needed, createFixedDelegation for setup, and transferFixed later with the delegatee signer. Amounts must be base units."
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
  const liveMode = isLiveSolanaMode();
  const rpcUrl = getSolanaRpcUrl();

  console.log("SAFE fixed allowance setup");
  console.log(`Mode: ${liveMode ? "live" : "demo"}`);
  console.log(`RPC URL: ${redactRpcUrl(rpcUrl)}`);
  printPackageInfo();

  if (liveMode) {
    throwLivePrerequisiteError(collectMissingLivePrerequisites());
  }

  await printDemoValues();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
