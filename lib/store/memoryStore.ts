import { DEMO_INTENT, DEMO_POLICY } from "@/lib/fixtures/demoPolicy";
import { ReplayGuard } from "@/lib/policy/replayGuard";
import { InMemoryReplayStore, createReplayStore, type ReplayStore } from "@/lib/policy/replayStore";
import type { SafeDemoRunRecord } from "@/lib/demo/demoRunner";
import type { AuditRecord } from "@/lib/types";

const auditRecords: AuditRecord[] = [];
const demoRuns: SafeDemoRunRecord[] = [];
let replayGuard = new ReplayGuard();
let replayStore: ReplayStore | null = null;

function cloneAuditRecord(record: AuditRecord): AuditRecord {
  return { ...record };
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// Shared Redis store when SAFE_REDIS_URL is set (multi-instance safe); otherwise
// an in-memory store that wraps the same ReplayGuard so the legacy synchronous
// `replayGuard` callers and the async `replayStore` callers never diverge.
function buildReplayStore(): ReplayStore {
  if (process.env.SAFE_REDIS_URL?.trim()) {
    return createReplayStore({
      SAFE_REDIS_URL: process.env.SAFE_REDIS_URL,
      SAFE_REPLAY_KEY_PREFIX: process.env.SAFE_REPLAY_KEY_PREFIX
    });
  }

  return new InMemoryReplayStore(replayGuard);
}

export const memoryStore = {
  policy: DEMO_POLICY,
  intent: DEMO_INTENT,
  get replayGuard() {
    return replayGuard;
  },
  get replayStore(): ReplayStore {
    return (replayStore ??= buildReplayStore());
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
  appendDemoRun(run: SafeDemoRunRecord) {
    const storedRun = cloneJson(run);
    demoRuns.unshift(storedRun);
    return cloneJson(storedRun);
  },
  listDemoRuns() {
    return demoRuns.map((run) => cloneJson(run));
  },
  clearDemoRuns() {
    demoRuns.length = 0;
  },
  resetReplay() {
    replayGuard = new ReplayGuard();
    replayStore = null; // rebuilt lazily so the in-memory store re-wraps the fresh guard
  }
};
