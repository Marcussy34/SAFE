import { HTTPFacilitatorClient } from "@x402/core/server";
import type { PaymentPayload, PaymentRequirements, VerifyResponse } from "@x402/core/types";
import { ExactSvmScheme } from "@x402/svm/exact/client";
import { isLiveSolanaMode } from "../../lib/solana/addresses";
import {
  applyLiveAllowanceToRequest,
  buildPublicX402AllowancePayload,
  getLiveAllowanceContext
} from "../../lib/solana/liveSettlement";
import { SOLANA_DEVNET_CHAIN_ID } from "../../lib/constants";
import {
  createDemoPaymentRequirement,
  normalizePaymentRequirement,
  type DemoPaymentRequirement
} from "../../lib/x402/paymentRequirements";
import { loadLocalEnv } from "./load-local-env";

const PUBLIC_X402_FACILITATOR_URL = "https://x402.org/facilitator";

function asErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function printVerifyResult(label: string, result: VerifyResponse): void {
  console.log(`${label}:`);
  console.log(`- Valid: ${result.isValid ? "yes" : "no"}`);
  console.log(`- Payer: ${result.payer || "(none)"}`);

  if (!result.isValid) {
    console.log(`- Reason: ${result.invalidReason || "(none)"}`);
  }

  if (result.invalidMessage) {
    console.log(`- Message: ${result.invalidMessage}`);
  }
}

function asPaymentRequirements(requirement: DemoPaymentRequirement): PaymentRequirements {
  return requirement as unknown as PaymentRequirements;
}

function getPublicSolanaFeePayer(supported: Awaited<ReturnType<HTTPFacilitatorClient["getSupported"]>>): string {
  const solanaExact = supported.kinds.find(
    (kind) => kind.x402Version === 2 && kind.scheme === "exact" && kind.network === SOLANA_DEVNET_CHAIN_ID
  );
  const feePayer = solanaExact?.extra?.feePayer;

  if (typeof feePayer !== "string" || !feePayer.trim()) {
    throw new Error("The public x402 facilitator did not return a Solana devnet fee payer.");
  }

  return feePayer;
}

async function buildDirectWalletPayload(paymentRequirements: PaymentRequirements): Promise<PaymentPayload> {
  const context = await getLiveAllowanceContext();
  const scheme = new ExactSvmScheme(context.userSigner, {
    rpcUrl: process.env.SOLANA_RPC_URL
  });
  const unsignedPayload = await scheme.createPaymentPayload(2, paymentRequirements);

  return {
    x402Version: 2,
    accepted: paymentRequirements,
    resource: {
      url: "https://stats-api.demo/live/argentina-vs-japan",
      description: "World Cup Stats API paid resource",
      mimeType: "application/json"
    },
    payload: unsignedPayload.payload
  };
}

async function main(): Promise<void> {
  loadLocalEnv();

  if (!isLiveSolanaMode()) {
    throw new Error("Set SAFE_DEMO_MODE=false before probing the public x402 Solana facilitator.");
  }

  const facilitator = new HTTPFacilitatorClient({ url: PUBLIC_X402_FACILITATOR_URL });
  const supported = await facilitator.getSupported();
  const feePayer = getPublicSolanaFeePayer(supported);
  const taskId = `public-x402-${Date.now()}`;
  const requirement = createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", taskId);
  const publicRequirement: DemoPaymentRequirement = {
    ...requirement,
    extra: {
      ...requirement.extra,
      feePayer,
      memo: `safe_${taskId}`
    }
  };
  const x402Requirement = asPaymentRequirements(publicRequirement);
  const request = await applyLiveAllowanceToRequest(normalizePaymentRequirement(publicRequirement));
  const allowancePayload = await buildPublicX402AllowancePayload(request, x402Requirement);

  console.log("SAFE public x402 verifier probe");
  console.log(`Facilitator: ${PUBLIC_X402_FACILITATOR_URL}`);
  console.log(`Network: ${x402Requirement.network}`);
  console.log(`Asset: ${x402Requirement.asset}`);
  console.log(`Amount: ${x402Requirement.amount} atomic units`);
  console.log(`PayTo: ${x402Requirement.payTo}`);
  console.log(`Public fee payer: ${feePayer}`);
  console.log(`Allowance recipient ATA: ${allowancePayload.recipientAta}`);
  console.log("");

  try {
    const allowanceResult = await facilitator.verify(allowancePayload.paymentPayload, x402Requirement);
    printVerifyResult("Allowance-backed transferFixed payload", allowanceResult);
  } catch (error) {
    console.log("Allowance-backed transferFixed payload:");
    console.log("- Valid: no");
    console.log(`- Error: ${asErrorMessage(error)}`);
  }

  console.log("");

  try {
    const directPayload = await buildDirectWalletPayload(x402Requirement);
    const directResult = await facilitator.verify(directPayload, x402Requirement);
    printVerifyResult("Direct wallet x402 control payload", directResult);
  } catch (error) {
    console.log("Direct wallet x402 control payload:");
    console.log("- Valid: no");
    console.log(`- Error: ${asErrorMessage(error)}`);
  }

  console.log("");
  console.log("No transaction was submitted. This script only calls the public facilitator /verify endpoint.");
}

main().catch((error: unknown) => {
  console.error(asErrorMessage(error));
  process.exitCode = 1;
});
