import { verifyAllowancePaymentOutcome } from "../../lib/facilitator/facilitatorVerifier";
import { buildAllowanceBackedPaymentPayload } from "../../lib/solana/allowanceSettlement";
import { isLiveSolanaMode } from "../../lib/solana/addresses";
import { createDemoPaymentRequirement, normalizePaymentRequirement } from "../../lib/x402/paymentRequirements";

function printResultSummary(valid: boolean, reasonCode: string, matchingTransferCount: number, innerTransferVerified: boolean): void {
  console.log("Verification summary:");
  console.log(`- Valid: ${valid ? "yes" : "no"}`);
  console.log(`- Reason: ${reasonCode}`);
  console.log(`- Matching transfers: ${matchingTransferCount}`);
  console.log(`- Inner transfer verified: ${innerTransferVerified ? "yes" : "no"}`);
}

function main(): void {
  const liveMode = isLiveSolanaMode();
  const requirement = createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", "settlement-smoke");
  const request = normalizePaymentRequirement(requirement);

  console.log("SAFE settlement smoke");
  console.log(`Mode: ${liveMode ? "live" : "demo"}`);

  if (liveMode) {
    console.log("Live mode requires transferFixed signer/plugin setup before settlement can run.");
  }

  const payload = buildAllowanceBackedPaymentPayload(request);
  const result = verifyAllowancePaymentOutcome(payload, request);

  console.log(`Request: ${request.merchantDomain} ${request.amountAtomicUnits} atomic units`);
  printResultSummary(result.valid, result.reasonCode, result.matchingTransferCount, result.innerTransferVerified);
  console.log("Demo mode did not submit a devnet transaction.");

  if (!result.valid) {
    process.exitCode = 1;
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
