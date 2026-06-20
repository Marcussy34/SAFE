import { describe, expect, it } from "vitest";
import { address } from "@solana/kit";
import { SOLANA_DEVNET_CHAIN_ID } from "@/lib/constants";
import { DEMO_POLICY } from "@/lib/fixtures/demoPolicy";
import { MERCHANTS } from "@/lib/fixtures/merchants";

describe("demo fixtures", () => {
  it("uses the Solana devnet x402 rail", () => {
    expect(DEMO_POLICY.allowedRails).toContain("x402_solana_allowance_devnet");
    expect(DEMO_POLICY.network).toBe(SOLANA_DEVNET_CHAIN_ID);
  });

  it("has trusted merchants for the approved demo flow", () => {
    expect(MERCHANTS["stats-api.demo"].category).toBe("match_data");
    expect(MERCHANTS["transit-api.demo"].category).toBe("transit");
    expect(MERCHANTS["food-voucher.demo"].category).toBe("food_voucher");
  });

  it("marks fake merch as blocked", () => {
    expect(MERCHANTS["fake-merch.demo"].trustStatus).toBe("blocked");
  });

  it("uses non-expired demo policy and allowance dates", () => {
    expect(new Date(DEMO_POLICY.expiresAt).getTime()).toBeGreaterThan(Date.now());
    expect(new Date(DEMO_POLICY.allowance.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("uses valid Solana public keys for fixture addresses", () => {
    const addresses = [
      DEMO_POLICY.allowance.delegatee,
      DEMO_POLICY.allowance.delegationPda,
      DEMO_POLICY.allowance.subscriptionAuthorityPda,
      DEMO_POLICY.allowance.delegatorAta,
      DEMO_POLICY.allowance.tokenMint,
      ...Object.values(MERCHANTS).map((merchant) => merchant.recipientAddress),
      ...Object.values(MERCHANTS).map((merchant) => merchant.tokenMint)
    ];

    for (const publicKey of addresses) {
      expect(() => address(publicKey)).not.toThrow();
    }
  });
});
