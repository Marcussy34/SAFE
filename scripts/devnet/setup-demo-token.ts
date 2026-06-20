import packageJson from "../../package.json";
import { DEMO_TOKEN_DECIMALS } from "../../lib/constants";
import { DEMO_POLICY } from "../../lib/fixtures/demoPolicy";
import { MERCHANTS } from "../../lib/fixtures/merchants";
import { deriveDemoAtaLabel, getSolanaRpcUrl, isLiveSolanaMode, redactRpcUrl } from "../../lib/solana/addresses";

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
    missing.push("SAFE_USER_SIGNER_BASE58 for the user mint authority/delegator signer");
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
      "Required path: add the official RPC/signer plugin dependencies, load signer material from env, create/fund the token with @solana/kit and @solana-program/token, then use @solana/subscriptions APIs such as initSubscriptionAuthority, createFixedDelegation, and transferFixed in the allowance flow."
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

function main(): void {
  const liveMode = isLiveSolanaMode();
  const rpcUrl = getSolanaRpcUrl();

  console.log("SAFE devnet token setup");
  console.log(`Mode: ${liveMode ? "live" : "demo"}`);
  console.log(`RPC URL: ${redactRpcUrl(rpcUrl)}`);
  printPackageInfo();

  if (liveMode) {
    throwLivePrerequisiteError(collectMissingLivePrerequisites());
  }

  printDemoValues();
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
