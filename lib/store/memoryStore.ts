import { DEMO_INTENT, DEMO_POLICY } from "@/lib/fixtures/demoPolicy";
import { ReplayGuard } from "@/lib/policy/replayGuard";
import type { AuditRecord } from "@/lib/types";

const auditRecords: AuditRecord[] = [];
let replayGuard = new ReplayGuard();

function cloneAuditRecord(record: AuditRecord): AuditRecord {
  return { ...record };
}

export const memoryStore = {
  policy: DEMO_POLICY,
  intent: DEMO_INTENT,
  get replayGuard() {
    return replayGuard;
  },
  appendAudit(record: AuditRecord) {
    const storedRecord = cloneAuditRecord(record);
    auditRecords.unshift(storedRecord);
    return cloneAuditRecord(storedRecord);
  },
  listAudit() {
    return auditRecords.map((record) => cloneAuditRecord(record));
  },
  clearAudit() {
    auditRecords.length = 0;
  },
  resetReplay() {
    replayGuard = new ReplayGuard();
  }
};
