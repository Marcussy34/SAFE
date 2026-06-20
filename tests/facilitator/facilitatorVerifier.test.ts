import { describe, expect, it } from "vitest";
import { verifyAllowancePaymentOutcome } from "@/lib/facilitator/facilitatorVerifier";
import { LIVE_SETTLEMENT_PREREQUISITE_ERROR, buildAllowanceBackedPaymentPayload } from "@/lib/solana/allowanceSettlement";
import type { NormalizedPaymentRequest, X402AllowancePayload } from "@/lib/types";
import { createDemoPaymentRequirement, normalizePaymentRequirement } from "@/lib/x402/paymentRequirements";
import { createDemoX402AllowancePayload } from "@/lib/x402/x402Payload";

function statsRequest(): NormalizedPaymentRequest {
  return normalizePaymentRequirement(createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", "task-1"));
}

function demoPayload(request = statsRequest()): X402AllowancePayload {
  return createDemoX402AllowancePayload(request);
}

function decodeTransaction(payload: X402AllowancePayload): Record<string, unknown> {
  return JSON.parse(Buffer.from(payload.payload.transaction, "base64").toString("utf8")) as Record<string, unknown>;
}

function encodeTransaction(transaction: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(transaction), "utf8").toString("base64");
}

describe("verifyAllowancePaymentOutcome", () => {
  it("accepts exactly one matching demo transfer built by both payload builders", () => {
    const request = statsRequest();
    const directPayload = createDemoX402AllowancePayload(request);
    const settlementPayload = buildAllowanceBackedPaymentPayload(request);

    expect(settlementPayload).toEqual(directPayload);

    const directResult = verifyAllowancePaymentOutcome(directPayload, request);
    const settlementResult = verifyAllowancePaymentOutcome(settlementPayload, request);

    expect(directResult).toMatchObject({
      valid: true,
      reasonCode: "EXACT_PAYMENT_VERIFIED",
      matchingTransferCount: 1,
      innerTransferVerified: true
    });
    expect(settlementResult).toMatchObject({
      valid: true,
      reasonCode: "EXACT_PAYMENT_VERIFIED",
      matchingTransferCount: 1,
      innerTransferVerified: true
    });
  });

  it("rejects amount mismatch", () => {
    const request = statsRequest();
    const payload = demoPayload(request);
    payload.accepted.amount = "10000";

    const result = verifyAllowancePaymentOutcome(payload, request);

    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe("AMOUNT_MISMATCH");
  });

  it("rejects payTo mismatch", () => {
    const request = statsRequest();
    const payload = demoPayload(request);
    payload.accepted.payTo = "WrongMerchant111111111111111111111111111111";

    const result = verifyAllowancePaymentOutcome(payload, request);

    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe("PAY_TO_MISMATCH");
  });

  it("rejects malformed base64 or JSON transaction content", () => {
    const request = statsRequest();
    const payload = demoPayload(request);
    payload.payload.transaction = "not-valid-base64-json";

    const result = verifyAllowancePaymentOutcome(payload, request);

    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe("MALFORMED_TRANSACTION");
  });

  it("rejects a matching transfer that is not marked as inner", () => {
    const request = statsRequest();
    const payload = demoPayload(request);
    const transaction = decodeTransaction(payload);
    const transfer = transaction.transfer as Record<string, unknown>;
    delete transfer.inner;
    payload.payload.transaction = encodeTransaction(transaction);

    const result = verifyAllowancePaymentOutcome(payload, request);

    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe("INNER_TRANSFER_MISSING");
    expect(result.matchingTransferCount).toBe(1);
  });

  it("rejects multiple matching transfers", () => {
    const request = statsRequest();
    const payload = demoPayload(request);
    const transaction = decodeTransaction(payload);
    const transfer = transaction.transfer as Record<string, unknown>;

    delete transaction.transfer;
    transaction.transfers = [transfer, { ...transfer }];
    payload.payload.transaction = encodeTransaction(transaction);

    const result = verifyAllowancePaymentOutcome(payload, request);

    expect(result.valid).toBe(false);
    expect(result.reasonCode).toBe("MULTIPLE_MATCHING_TRANSFERS");
    expect(result.matchingTransferCount).toBe(2);
  });

  it("keeps the demo payload builder disabled when SAFE_DEMO_MODE=false", () => {
    expect(() => buildAllowanceBackedPaymentPayload(statsRequest(), { SAFE_DEMO_MODE: "false" })).toThrow(
      LIVE_SETTLEMENT_PREREQUISITE_ERROR
    );
  });
});
