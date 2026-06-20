import { describe, expect, it } from "vitest";
import { createSettlementResponse } from "@/app/api/facilitator/settle/route";
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
  it("returns a deterministic demo settlement response for verified mock payloads", async () => {
    const response = createSettlementResponse(verifiedResult(), request());
    const body = (await response.json()) as { settlementStatus: string; result: { txSignature?: string } };

    expect(response.status).toBe(200);
    expect(body.settlementStatus).toBe("settled");
    expect(body.result.txSignature).toMatch(/^demo_sig_/);
  });

  it("rejects unverified mock payloads", async () => {
    const response = createSettlementResponse(
      {
        ...verifiedResult(),
        valid: false,
        reasonCode: "NO_MATCHING_TRANSFER"
      },
      request()
    );
    const body = (await response.json()) as { settlementStatus: string; result: { txSignature?: string } };

    expect(response.status).toBe(400);
    expect(body.settlementStatus).toBe("failed");
    expect(body.result.txSignature).toBeUndefined();
  });
});
