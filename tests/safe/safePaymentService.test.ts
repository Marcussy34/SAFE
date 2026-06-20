import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { memoryStore } from "@/lib/store/memoryStore";
import { fetchX402ChallengeFromResource, safePay, safePreflight } from "@/lib/safe/safePaymentService";
import { createDemoPaymentRequirement, createPaymentRequiredResponse } from "@/lib/x402/paymentRequirements";

describe("safePaymentService", () => {
  const originalFetch = globalThis.fetch;
  let originalSafeDemoMode: string | undefined;

  beforeEach(() => {
    originalSafeDemoMode = process.env.SAFE_DEMO_MODE;
    process.env.SAFE_DEMO_MODE = "true";
    memoryStore.clearAudit();
    memoryStore.resetReplay();
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    if (originalSafeDemoMode === undefined) {
      delete process.env.SAFE_DEMO_MODE;
    } else {
      process.env.SAFE_DEMO_MODE = originalSafeDemoMode;
    }

    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("keeps preflight and dry-run advisory so the later real payment can settle", async () => {
    const requirement = createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", "task-1");
    const preflight = await safePreflight({ requirement });
    const dryRun = await safePay({ requirement, dryRun: true });
    const payment = await safePay({ requirement });
    const duplicate = await safePay({ requirement });

    expect(preflight.decision.reasonCode).toBe("POLICY_OK");
    expect(dryRun.decision.reasonCode).toBe("POLICY_OK");
    expect(dryRun.auditRecord).toBeUndefined();
    expect(dryRun.settlement).toBeUndefined();
    expect(payment.decision.reasonCode).toBe("POLICY_OK");
    expect(payment.settlement?.settlementStatus).toBe("settled");
    expect(duplicate.decision.reasonCode).toBe("DUPLICATE_PAYMENT_REQUEST");
    expect(duplicate.settlement).toBeUndefined();
    expect(memoryStore.listAudit()).toHaveLength(2);
  });

  it("records blocked payments without producing a transaction", async () => {
    const requirement = createDemoPaymentRequirement("fake-merch.demo", "/jersey", "task-1");
    const result = await safePay({ requirement });

    expect(result.decision.reasonCode).toBe("MERCHANT_NOT_ALLOWLISTED");
    expect(result.settlement).toBeUndefined();
    expect(result.auditRecord?.settlementStatus).toBe("not_attempted");
    expect(result.auditRecord?.txSignature).toBeUndefined();
  });

  it("redacts agent metadata before settlement and audit", async () => {
    const requirement = createDemoPaymentRequirement("stats-api.demo", "/live/metadata-leak", "task-1");
    const result = await safePay({
      requirement,
      agentReason: "Email marcus@example.com at Hotel Central for shuttle pickup."
    });

    expect(result.decision.reasonCode).toBe("PII_REDACTED");
    expect(result.decision.sanitizedRequest?.reason).toContain("[REDACTED_EMAIL]");
    expect(result.decision.sanitizedRequest?.reason).toContain("[REDACTED_HOTEL]");
    expect(result.settlement?.settlementStatus).toBe("settled");
    expect(result.auditRecord?.reasonCode).toBe("PII_REDACTED");
    expect(result.auditRecord?.settlementStatus).toBe("settled");
  });

  it("parses x402 resource challenges from headers and body", async () => {
    const requirement = createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", "task-1");
    globalThis.fetch = vi.fn(async () => createPaymentRequiredResponse(requirement)) as unknown as typeof fetch;

    const challenge = await fetchX402ChallengeFromResource("http://localhost:3000/api/x402/stats");

    expect(challenge.status).toBe(402);
    expect(challenge.requirement.extra.merchantDomain).toBe("stats-api.demo");
    expect(challenge.paymentRequired?.accepts[0].extra.resourceUrl).toBe(requirement.extra.resourceUrl);
  });

  it("pays a resource URL and fetches the protected content after settlement", async () => {
    const requirement = createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", "task-1");
    let fetchCount = 0;

    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      fetchCount += 1;

      if (fetchCount === 1) {
        return createPaymentRequiredResponse(requirement);
      }

      expect(new Headers(init?.headers).get("x-safe-demo-payment")).toBe("settled");
      return Response.json({ match: "Argentina vs Japan", x402: "paid" });
    }) as unknown as typeof fetch;

    const result = await safePay({ resourceUrl: "http://localhost:3000/api/x402/stats" });

    expect(result.decision.reasonCode).toBe("POLICY_OK");
    expect(result.settlement?.settlementStatus).toBe("settled");
    expect(result.resource?.body).toEqual({ match: "Argentina vs Japan", x402: "paid" });
    expect(fetchCount).toBe(2);
  });
});
