import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSettlementResponse } from "@/app/api/facilitator/settle/route";
import { LIVE_SETTLEMENT_PREREQUISITE_ERROR } from "@/lib/solana/allowanceSettlement";
import type { AllowanceVerificationResult, NormalizedPaymentRequest } from "@/lib/types";
import { createDemoPaymentRequirement, normalizePaymentRequirement } from "@/lib/x402/paymentRequirements";

function request(): NormalizedPaymentRequest {
  return normalizePaymentRequirement(createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", "task-1"));
}

function verifiedResult(): AllowanceVerificationResult {
  return {
    valid: true,
    reasonCode: "EXACT_PAYMENT_VERIFIED",
    matchingTransferCount: 1,
    innerTransferVerified: true
  };
}

describe("createSettlementResponse", () => {
  let originalSafeDemoMode: string | undefined;

  beforeEach(() => {
    originalSafeDemoMode = process.env.SAFE_DEMO_MODE;
  });

  afterEach(() => {
    if (originalSafeDemoMode === undefined) {
      delete process.env.SAFE_DEMO_MODE;
    } else {
      process.env.SAFE_DEMO_MODE = originalSafeDemoMode;
    }
  });

  it("returns demo settlement only in demo mode", async () => {
    process.env.SAFE_DEMO_MODE = "true";

    const response = createSettlementResponse(verifiedResult(), request());
    const body = (await response.json()) as { settlementStatus: string; result: { txSignature?: string } };

    expect(response.status).toBe(200);
    expect(body.settlementStatus).toBe("settled");
    expect(body.result.txSignature).toMatch(/^demo_sig_/);
  });

  it("does not fake settlement in live mode", async () => {
    process.env.SAFE_DEMO_MODE = "false";

    const response = createSettlementResponse(verifiedResult(), request());
    const body = (await response.json()) as { error: string; settlementStatus: string; result: { txSignature?: string } };

    expect(response.status).toBe(501);
    expect(body.error).toBe(LIVE_SETTLEMENT_PREREQUISITE_ERROR);
    expect(body.settlementStatus).toBe("failed");
    expect(body.result.txSignature).toBeUndefined();
  });
});
