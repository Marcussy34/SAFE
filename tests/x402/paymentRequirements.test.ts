import { describe, expect, it } from "vitest";
import { parsePaymentRequired } from "@x402/core/schemas";
import { MERCHANTS } from "@/lib/fixtures/merchants";
import {
  createDemoPaymentRequirement,
  createPaymentRequiredResponse,
  hasX402PaymentAttempt,
  normalizePaymentRequirement
} from "@/lib/x402/paymentRequirements";

describe("x402 payment requirements", () => {
  it("creates a deterministic stats API payment requirement", () => {
    const requirement = createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", "task-1");

    expect(requirement.scheme).toBe("exact");
    expect(requirement.amount).toBe("20000");
    expect(requirement.asset).toBe(MERCHANTS["stats-api.demo"].tokenMint);
    expect(requirement.payTo).toBe(MERCHANTS["stats-api.demo"].recipientAddress);
    expect(requirement.extra.merchantDomain).toBe("stats-api.demo");
    expect(requirement.extra.taskId).toBe("task-1");
  });

  it("normalizes a trusted stats API challenge", () => {
    const requirement = createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", "task-1");
    const normalized = normalizePaymentRequirement(requirement);

    expect(normalized.merchantDomain).toBe("stats-api.demo");
    expect(normalized.amountUsdc).toBe(0.02);
    expect(normalized.scheme).toBe("exact");
    expect(normalized.rail).toBe("x402_solana_allowance_devnet");
  });

  it("normalizes fake merch as a blocked category candidate", () => {
    const requirement = createDemoPaymentRequirement("fake-merch.demo", "/jersey", "task-1");
    const normalized = normalizePaymentRequirement(requirement);

    expect(normalized.merchantDomain).toBe("fake-merch.demo");
    expect(normalized.category).toBe("merch");
  });

  it("keeps the merchant registry recipient ATA", () => {
    const requirement = createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", "task-1");
    const normalized = normalizePaymentRequirement(requirement);

    expect(normalized.recipientAta).toBe(MERCHANTS["stats-api.demo"].recipientAta);
  });

  it("throws for unknown merchant domains", () => {
    expect(() => createDemoPaymentRequirement("unknown.demo", "/resource", "task-1")).toThrow("Unknown merchant domain");

    const requirement = createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", "task-1");
    expect(() =>
      normalizePaymentRequirement({
        ...requirement,
        extra: {
          ...requirement.extra,
          merchantDomain: "unknown.demo"
        }
      })
    ).toThrow("Unknown merchant domain");
  });

  it("rejects amount metadata that does not match the x402 atomic amount", () => {
    const requirement = createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", "task-1");

    expect(() =>
      normalizePaymentRequirement({
        ...requirement,
        extra: {
          ...requirement.extra,
          amountUsdc: 0.01
        }
      })
    ).toThrow("Payment amount mismatch");
  });

  it("hashes semantically identical requirements with stable canonical ordering", () => {
    const requirement = createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", "task-1");
    const reorderedRequirement = {
      extra: {
        taskId: requirement.extra.taskId,
        memo: requirement.extra.memo,
        feePayer: requirement.extra.feePayer,
        mimeType: requirement.extra.mimeType,
        description: requirement.extra.description,
        resourceUrl: requirement.extra.resourceUrl,
        amountUsdc: requirement.extra.amountUsdc,
        merchantDomain: requirement.extra.merchantDomain
      },
      maxTimeoutSeconds: requirement.maxTimeoutSeconds,
      payTo: requirement.payTo,
      asset: requirement.asset,
      amount: requirement.amount,
      network: requirement.network,
      scheme: requirement.scheme
    };

    const normalized = normalizePaymentRequirement(requirement);
    const reordered = normalizePaymentRequirement(reorderedRequirement);

    expect(reordered.rawRequestHash).toBe(normalized.rawRequestHash);
    expect(reordered.requestId).toBe(normalized.requestId);
  });

  it("creates an x402 v2 payment required response with an encoded requirement header", async () => {
    const requirement = createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", "task-1");
    const response = createPaymentRequiredResponse(requirement);

    expect(response.status).toBe(402);
    expect(response.headers.get("payment-required")).toBeTruthy();
    expect(response.headers.get("x-safe-demo-accept-payment")).toBeTruthy();

    const encodedPaymentRequired = response.headers.get("payment-required");
    const decodedPaymentRequired = JSON.parse(Buffer.from(encodedPaymentRequired ?? "", "base64").toString("utf8")) as unknown;
    const parsedPaymentRequired = parsePaymentRequired(decodedPaymentRequired);

    const body = (await response.json()) as { x402Version: number; accepts: unknown[] };
    expect(parsedPaymentRequired.success).toBe(true);
    expect(body.x402Version).toBe(2);
    expect(body.accepts[0]).toMatchObject({ scheme: "exact" });
  });

  it("recognizes v2 payment signatures and explicit SAFE demo settlement markers", () => {
    expect(hasX402PaymentAttempt(new Request("https://safe.test/api", { headers: { "PAYMENT-SIGNATURE": "payload" } }))).toBe(true);
    expect(hasX402PaymentAttempt(new Request("https://safe.test/api?payment=settled"))).toBe(true);
    expect(hasX402PaymentAttempt(new Request("https://safe.test/api", { headers: { "x-safe-demo-payment": "settled" } }))).toBe(true);
    expect(hasX402PaymentAttempt(new Request("https://safe.test/api", { headers: { "x-payment": "settled" } }))).toBe(false);
  });
});
