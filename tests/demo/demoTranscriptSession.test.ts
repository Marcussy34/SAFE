import { describe, expect, it } from "vitest";

import { filterRunsAfterDashboardLoad } from "@/lib/demo/demoTranscriptSession";
import type { SafeDemoRunRecord } from "@/lib/demo/demoRunner";

function run(runId: string, completedAt: string): SafeDemoRunRecord {
  return {
    runId,
    startedAt: completedAt,
    completedAt,
    prompt: "test",
    mode: "dry-run",
    generatedPolicy: {
      policyId: "policy",
      userIntent: "test",
      maxTotalUsdc: 1,
      perPaymentCapUsdc: 0.1,
      allowedCategories: [],
      blockedCategories: [],
      allowedDomains: [],
      piiMode: "redact_or_block",
      network: "solana-devnet",
      allowanceAtomicUnits: "1000000",
      replayWindowSeconds: 300
    },
    allowance: {
      totalCapUsdc: 1,
      remainingAtomicUnits: "1000000",
      expiresAt: completedAt
    },
    steps: [],
    summary: {
      approved: 0,
      blocked: 0,
      redacted: 0,
      settled: 0,
      failed: 0,
      attemptedSpendUsdc: 0,
      settledSpendUsdc: 0,
      auditRecords: 0,
      dryRun: true
    }
  };
}

describe("filterRunsAfterDashboardLoad", () => {
  it("hides runs completed before the dashboard page session started", () => {
    const sessionStartedAtMs = Date.parse("2026-06-20T07:00:01.000Z");
    const runs = [
      run("new", "2026-06-20T07:00:02.000Z"),
      run("old", "2026-06-20T07:00:00.000Z")
    ];

    expect(filterRunsAfterDashboardLoad(runs, sessionStartedAtMs).map((item) => item.runId)).toEqual(["new"]);
  });
});
