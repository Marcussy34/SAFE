import { verifyAllowancePaymentOutcome } from "../../lib/facilitator/facilitatorVerifier";
import { buildAllowanceBackedPaymentPayload } from "../../lib/solana/allowanceSettlement";
import { isLiveSolanaMode } from "../../lib/solana/addresses";
import { applyLiveAllowanceToRequest, settleLiveAllowancePayment } from "../../lib/solana/liveSettlement";
import { createDemoPaymentRequirement, normalizePaymentRequirement } from "../../lib/x402/paymentRequirements";
import { loadLocalEnv } from "./load-local-env";

function printResultSummary(valid: boolean, reasonCode: string, matchingTransferCount: number, innerTransferVerified: boolean): void {
  console.log("Verification summary:");
  console.log(`- Valid: ${valid ? "yes" : "no"}`);
  console.log(`- Reason: ${reasonCode}`);
  console.log(`- Matching transfers: ${matchingTransferCount}`);
  console.log(`- Inner transfer verified: ${innerTransferVerified ? "yes" : "no"}`);
}

async function main(): Promise<void> {
  loadLocalEnv();

  const liveMode = isLiveSolanaMode();
  const requirement = createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", "settlement-smoke");
  const normalized = normalizePaymentRequirement(requirement);
  const request = liveMode ? await applyLiveAllowanceToRequest(normalized) : normalized;

  console.log("SAFE settlement smoke");
  console.log(`Mode: ${liveMode ? "live" : "demo"}`);

  if (liveMode) {
    const settlement = await settleLiveAllowancePayment(request);

    console.log(`Request: ${request.merchantDomain} ${request.amountAtomicUnits} atomic units`);
    console.log("Live settlement:");
    console.log(`- Status: ${settlement.settlementStatus}`);
    console.log(`- Signature: ${settlement.txSignature}`);
    console.log(`- Recipient ATA: ${settlement.recipientAta}`);
    console.log(`- Explorer URL: ${settlement.explorerUrl}`);
    return;
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

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
