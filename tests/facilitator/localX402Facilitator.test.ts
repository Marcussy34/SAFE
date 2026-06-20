import { describe, expect, it } from "vitest";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { createLocalX402PaymentRequirements } from "@/lib/facilitator/localX402Facilitator";
import { createDemoPaymentRequirement, normalizePaymentRequirement } from "@/lib/x402/paymentRequirements";

function testSecret() {
  return bs58.encode(Keypair.generate().secretKey);
}

describe("local x402 facilitator helpers", () => {
  it("creates exact SVM requirements for SAFE allowance settlement", async () => {
    const request = normalizePaymentRequirement(createDemoPaymentRequirement("stats-api.demo", "/live", "task-1"));
    const requirements = await createLocalX402PaymentRequirements(request, {
      SAFE_FACILITATOR_SECRET_BASE58: testSecret(),
      SOLANA_RPC_URL: "https://api.devnet.solana.com"
    });

    expect(requirements).toMatchObject({
      scheme: "exact",
      network: request.network,
      amount: request.amountAtomicUnits,
      asset: request.assetMint,
      payTo: request.recipientAddress,
      maxTimeoutSeconds: 60
    });
    expect(requirements.extra.feePayer).toEqual(expect.any(String));
    expect(requirements.extra.memo).toBe(request.x402.memo);
  });

  it("rejects non-CAIP network identifiers at the x402 boundary", async () => {
    const request = normalizePaymentRequirement(createDemoPaymentRequirement("stats-api.demo", "/live", "task-1"));

    await expect(
      createLocalX402PaymentRequirements(
        {
          ...request,
          network: "devnet"
        },
        {
          SAFE_FACILITATOR_SECRET_BASE58: testSecret()
        }
      )
    ).rejects.toThrow("Invalid x402 network identifier");
  });
});
