import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { usdcToAtomicUnits } from "@/lib/constants";
import { runWorldCupAgentScenario } from "@/lib/agent/worldCupAgent";
import { memoryStore } from "@/lib/store/memoryStore";

describe("runWorldCupAgentScenario", () => {
  let originalSafeDemoMode: string | undefined;

  beforeEach(() => {
    originalSafeDemoMode = process.env.SAFE_DEMO_MODE;
    process.env.SAFE_DEMO_MODE = "true";
  });

  afterEach(() => {
    if (originalSafeDemoMode === undefined) {
      delete process.env.SAFE_DEMO_MODE;
    } else {
      process.env.SAFE_DEMO_MODE = originalSafeDemoMode;
    }
  });

  it("records seven expected preflight outcomes in newest-first audit order", async () => {
    const result = await runWorldCupAgentScenario();
    const reasonCodes = result.attempts.map((attempt) => attempt.decision.reasonCode);

    expect(result.attempts).toHaveLength(7);
    expect(reasonCodes).toEqual([
      "POLICY_OK",
      "POLICY_OK",
      "POLICY_OK",
      "MERCHANT_NOT_ALLOWLISTED",
      "DUPLICATE_PAYMENT_REQUEST",
      "AMOUNT_OVER_PER_PAYMENT_CAP",
      "PII_REDACTED"
    ]);

    expect(result.audit).toHaveLength(7);
    expect(memoryStore.listAudit()).toHaveLength(7);
    expect(result.audit.map((record) => record.auditId)).toEqual(result.attempts.map((attempt) => attempt.auditRecord.auditId).reverse());
    expect(result.audit.map((record) => record.reasonCode)).toEqual([...reasonCodes].reverse());

    for (const attempt of result.attempts) {
      const expectedStatus = attempt.decision.action === "reject" ? "not_attempted" : "settled";
      expect(attempt.auditRecord.settlementStatus).toBe(expectedStatus);
      expect(attempt.auditRecord.paymentRequestHash).toBe((attempt.decision.sanitizedRequest ?? attempt.request).rawRequestHash);
    }
  });

  it("settles approved attempts and leaves blocked attempts unsigned", async () => {
    memoryStore.clearAudit();
    const result = await runWorldCupAgentScenario();
    const approved = result.attempts.filter(
      (attempt) => attempt.decision.action === "approve" || attempt.decision.action === "redact_and_approve"
    );
    const blocked = result.attempts.filter((attempt) => attempt.decision.action === "reject");

    expect(approved.every((attempt) => attempt.settlement?.settlementStatus === "settled")).toBe(true);
    expect(blocked.every((attempt) => attempt.settlement === undefined)).toBe(true);

    for (const attempt of approved) {
      expect(attempt.auditRecord.settlementStatus).toBe("settled");
      expect(attempt.auditRecord.txSignature).toBe(attempt.settlement?.txSignature);
      expect(attempt.settlement?.explorerUrl).toBe(
        `https://explorer.solana.com/tx/${attempt.settlement?.txSignature}?cluster=devnet`
      );
    }

    for (const attempt of blocked) {
      expect(attempt.auditRecord.settlementStatus).toBe("not_attempted");
      expect(attempt.auditRecord.txSignature).toBeUndefined();
    }
  });

  it("records failed settlement without throwing when live settlement is prerequisite-gated", async () => {
    process.env.SAFE_DEMO_MODE = "false";

    const result = await runWorldCupAgentScenario();
    const approved = result.attempts.filter(
      (attempt) => attempt.decision.action === "approve" || attempt.decision.action === "redact_and_approve"
    );
    const blocked = result.attempts.filter((attempt) => attempt.decision.action === "reject");

    expect(approved).toHaveLength(4);
    expect(approved.every((attempt) => attempt.settlement?.settlementStatus === "failed")).toBe(true);
    expect(approved.every((attempt) => attempt.auditRecord.settlementStatus === "failed")).toBe(true);
    expect(approved.every((attempt) => attempt.settlement?.error?.includes("prerequisite-gated"))).toBe(true);
    expect(blocked.every((attempt) => attempt.settlement === undefined)).toBe(true);
    expect(blocked.every((attempt) => attempt.auditRecord.settlementStatus === "not_attempted")).toBe(true);
  });

  it("keeps replay, amount, and audit hashes coherent for settlement", async () => {
    const result = await runWorldCupAgentScenario();
    const statsAttempt = result.attempts[0];
    const duplicateAttempt = result.attempts.find((attempt) => attempt.decision.reasonCode === "DUPLICATE_PAYMENT_REQUEST");
    const overLimitAttempt = result.attempts.find((attempt) => attempt.decision.reasonCode === "AMOUNT_OVER_PER_PAYMENT_CAP");
    const piiAttempt = result.attempts.find((attempt) => attempt.decision.reasonCode === "PII_REDACTED");

    if (!duplicateAttempt || !overLimitAttempt || !piiAttempt) {
      throw new Error("Expected duplicate, over-limit, and PII attempts.");
    }

    expect(duplicateAttempt.request.rawRequestHash).toBe(statsAttempt.request.rawRequestHash);
    expect(duplicateAttempt.auditRecord.paymentRequestHash).toBe(statsAttempt.request.rawRequestHash);

    expect(overLimitAttempt.request.amountUsdc).toBe(0.5);
    expect(overLimitAttempt.request.amountAtomicUnits).toBe(usdcToAtomicUnits(overLimitAttempt.request.amountUsdc));
    expect(overLimitAttempt.auditRecord.amountUsdc).toBe(overLimitAttempt.request.amountUsdc);
    expect(overLimitAttempt.auditRecord.paymentRequestHash).toBe(overLimitAttempt.request.rawRequestHash);

    if (!piiAttempt.decision.sanitizedRequest || !piiAttempt.settlement?.txSignature) {
      throw new Error("Expected the PII attempt to settle with a sanitized request.");
    }

    expect(piiAttempt.auditRecord.paymentRequestHash).toBe(piiAttempt.decision.sanitizedRequest.rawRequestHash);
    expect(piiAttempt.decision.sanitizedRequest.rawRequestHash).toBe(piiAttempt.request.rawRequestHash);
    expect(piiAttempt.request.reason).toBe(piiAttempt.decision.sanitizedRequest.reason);
    expect(piiAttempt.settlement.txSignature).toBe(`demo_sig_${piiAttempt.decision.sanitizedRequest.rawRequestHash.slice(0, 16)}`);
    expect(piiAttempt.auditRecord.txSignature).toBe(piiAttempt.settlement.txSignature);
  });

  it("returns redacted metadata on the PII attempt decision", async () => {
    const result = await runWorldCupAgentScenario();
    const piiAttempt = result.attempts.find((attempt) => attempt.decision.reasonCode === "PII_REDACTED");

    if (!piiAttempt) {
      throw new Error("Expected a PII_REDACTED attempt.");
    }

    expect(piiAttempt.decision.action).toBe("redact_and_approve");
    expect(piiAttempt.request.reason).not.toContain("marcus@example.com");
    expect(piiAttempt.request.reason).not.toContain("Hotel Central");
    expect(piiAttempt.request.reason).toContain("[REDACTED_EMAIL]");
    expect(piiAttempt.request.reason).toContain("[REDACTED_HOTEL]");
    expect(piiAttempt.decision.sanitizedRequest?.reason).toContain("[REDACTED_EMAIL]");
    expect(piiAttempt.decision.sanitizedRequest?.reason).toContain("[REDACTED_HOTEL]");
    expect(piiAttempt.decision.sanitizedRequest?.reason).not.toContain("marcus@example.com");
    expect(piiAttempt.auditRecord.reasonCode).toBe("PII_REDACTED");
    expect(piiAttempt.auditRecord.settlementStatus).toBe("settled");
    expect(piiAttempt.settlement?.settlementStatus).toBe("settled");
  });
});
