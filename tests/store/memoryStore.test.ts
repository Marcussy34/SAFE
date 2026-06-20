import { beforeEach, describe, expect, it } from "vitest";
import { memoryStore } from "@/lib/store/memoryStore";
import type { AuditRecord } from "@/lib/types";

function auditRecord(overrides: Partial<AuditRecord> = {}): AuditRecord {
  return {
    auditId: "audit_test",
    timestamp: "2026-06-19T00:00:00.000Z",
    policyId: "pol_wc_matchday_001",
    paymentRequestHash: "hash_test",
    merchantDomain: "stats-api.demo",
    amountUsdc: 0.02,
    decision: "approve",
    reasonCode: "POLICY_OK",
    piiDetected: false,
    duplicateDetected: false,
    settlementStatus: "not_attempted",
    ...overrides
  };
}

describe("memoryStore", () => {
  beforeEach(() => {
    memoryStore.clearAudit();
    memoryStore.resetReplay();
  });

  it("returns defensive audit record copies", () => {
    const original = auditRecord();
    const appended = memoryStore.appendAudit(original);

    original.reasonCode = "MUTATED_INPUT";
    appended.reasonCode = "MUTATED_RETURN";

    const listed = memoryStore.listAudit();
    listed[0].reasonCode = "MUTATED_LIST";

    expect(memoryStore.listAudit()[0]).toMatchObject({
      auditId: "audit_test",
      reasonCode: "POLICY_OK"
    });
  });

  it("can reset replay state through a detached function reference", () => {
    const first = memoryStore.replayGuard.checkAndRemember("stats-api.demo:20000:match", "hash-a", 300, 1000);
    const duplicate = memoryStore.replayGuard.checkAndRemember("stats-api.demo:20000:match", "hash-a", 300, 1100);

    const resetReplay = memoryStore.resetReplay;
    resetReplay();

    const afterReset = memoryStore.replayGuard.checkAndRemember("stats-api.demo:20000:match", "hash-a", 300, 1200);

    expect(first.duplicate).toBe(false);
    expect(duplicate.duplicate).toBe(true);
    expect(afterReset.duplicate).toBe(false);
  });
});
