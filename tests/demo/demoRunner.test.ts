import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { DEFAULT_SAFE_DEMO_PROMPT, runSafeDemo } from "@/lib/demo/demoRunner";
import { memoryStore } from "@/lib/store/memoryStore";

describe("runSafeDemo", () => {
  let originalSafeDemoMode: string | undefined;
  let originalUserSigner: string | undefined;
  let originalSessionSigner: string | undefined;
  let originalFacilitatorSigner: string | undefined;

  beforeEach(() => {
    originalSafeDemoMode = process.env.SAFE_DEMO_MODE;
    originalUserSigner = process.env.SAFE_USER_SIGNER_BASE58;
    originalSessionSigner = process.env.SAFE_SESSION_SECRET_BASE58;
    originalFacilitatorSigner = process.env.SAFE_FACILITATOR_SECRET_BASE58;
    process.env.SAFE_DEMO_MODE = "true";
    delete process.env.SAFE_USER_SIGNER_BASE58;
    delete process.env.SAFE_SESSION_SECRET_BASE58;
    delete process.env.SAFE_FACILITATOR_SECRET_BASE58;
    memoryStore.clearAudit();
    memoryStore.clearDemoRuns();
    memoryStore.resetReplay();
  });

  afterEach(() => {
    if (originalSafeDemoMode === undefined) {
      delete process.env.SAFE_DEMO_MODE;
    } else {
      process.env.SAFE_DEMO_MODE = originalSafeDemoMode;
    }

    if (originalUserSigner === undefined) {
      delete process.env.SAFE_USER_SIGNER_BASE58;
    } else {
      process.env.SAFE_USER_SIGNER_BASE58 = originalUserSigner;
    }

    if (originalSessionSigner === undefined) {
      delete process.env.SAFE_SESSION_SECRET_BASE58;
    } else {
      process.env.SAFE_SESSION_SECRET_BASE58 = originalSessionSigner;
    }

    if (originalFacilitatorSigner === undefined) {
      delete process.env.SAFE_FACILITATOR_SECRET_BASE58;
    } else {
      process.env.SAFE_FACILITATOR_SECRET_BASE58 = originalFacilitatorSigner;
    }
  });

  it("runs the match-day demo and stores a dashboard transcript", async () => {
    const run = await runSafeDemo({
      prompt: DEFAULT_SAFE_DEMO_PROMPT,
      dryRun: false,
      requireLive: false
    });

    expect(run.prompt).toBe(DEFAULT_SAFE_DEMO_PROMPT);
    expect(run.mode).toBe("demo-settlement");
    expect(run.generatedPolicy.maxTotalUsdc).toBe(5);
    expect(run.generatedPolicy.allowedCategories).toEqual(["match_data", "transit", "food_voucher"]);
    expect(run.generatedPolicy.blockedCategories).toEqual(["gambling", "merch", "unknown"]);
    expect(run.steps).toHaveLength(8);
    expect(run.steps.map((step) => step.decision.reasonCode)).toEqual([
      "POLICY_OK",
      "POLICY_OK",
      "POLICY_OK",
      "MERCHANT_NOT_ALLOWLISTED",
      "MERCHANT_NOT_ALLOWLISTED",
      "DUPLICATE_PAYMENT_REQUEST",
      "AMOUNT_OVER_PER_PAYMENT_CAP",
      "PII_REDACTED"
    ]);
    expect(run.summary).toMatchObject({
      approved: 3,
      blocked: 4,
      redacted: 1,
      settled: 4,
      failed: 0,
      dryRun: false
    });
    expect(run.summary.settledSpendUsdc).toBeCloseTo(0.14);
    expect(memoryStore.listAudit()).toHaveLength(8);

    const piiStep = run.steps.find((step) => step.decision.reasonCode === "PII_REDACTED");
    expect(piiStep?.agentReason).toContain("[REDACTED_EMAIL]");
    expect(piiStep?.agentReason).toContain("[REDACTED_HOTEL]");
    expect(piiStep?.agentReason).not.toContain("marcus@example.com");
    expect(piiStep?.agentReason).not.toContain("Hotel Central");

    const storedRuns = memoryStore.listDemoRuns();
    expect(storedRuns).toHaveLength(1);
    expect(storedRuns[0]).toEqual(run);
    storedRuns[0].summary.approved = 999;
    expect(memoryStore.listDemoRuns()[0].summary.approved).toBe(3);
  });

  it("rehearses the full policy path without audit records or settlements", async () => {
    const run = await runSafeDemo({
      prompt: DEFAULT_SAFE_DEMO_PROMPT,
      dryRun: true,
      requireLive: false
    });

    expect(run.mode).toBe("dry-run");
    expect(run.summary).toMatchObject({
      approved: 3,
      blocked: 4,
      redacted: 1,
      settled: 0,
      failed: 0,
      dryRun: true
    });
    expect(run.steps.map((step) => step.decision.reasonCode)).toContain("DUPLICATE_PAYMENT_REQUEST");
    expect(run.steps.every((step) => step.auditRecord === undefined)).toBe(true);
    expect(run.steps.every((step) => step.settlement === undefined)).toBe(true);
    expect(memoryStore.listAudit()).toHaveLength(0);
  });

  it("enforces a food-voucher-only prompt as a per-run firewall policy", async () => {
    const run = await runSafeDemo({
      prompt: "$5 for food vouchers only.",
      dryRun: true,
      requireLive: false
    });

    expect(run.generatedPolicy.allowedCategories).toEqual(["food_voucher"]);
    expect(run.generatedPolicy.blockedCategories).toEqual(["match_data", "transit", "merch", "gambling", "unknown"]);
    expect(run.generatedPolicy.allowedDomains).toEqual(["food-voucher.demo"]);

    const approvedSteps = run.steps.filter(
      (step) => step.decision.action === "approve" || step.decision.action === "redact_and_approve"
    );
    expect(approvedSteps.map((step) => step.id)).toEqual(["food-voucher"]);
    expect(run.steps.find((step) => step.id === "match-data")?.decision.action).toBe("reject");
    expect(run.steps.find((step) => step.id === "transit")?.decision.action).toBe("reject");
    expect(run.summary).toMatchObject({
      approved: 1,
      blocked: 7,
      redacted: 0,
      settled: 0,
      failed: 0,
      dryRun: true
    });
    expect(memoryStore.listAudit()).toHaveLength(0);
  });

  it("settles only the trusted merch merchant for a merch prompt", async () => {
    const run = await runSafeDemo({
      prompt: "$4 for merch and gambling",
      dryRun: true,
      requireLive: false
    });

    expect(run.generatedPolicy.allowedCategories).toEqual(["merch", "gambling"]);
    expect(run.generatedPolicy.blockedCategories).toEqual([
      "match_data",
      "transit",
      "food_voucher",
      "unknown"
    ]);
    expect(run.generatedPolicy.allowedDomains).toEqual(["official-merch.demo"]);
    expect(run.steps.find((step) => step.id === "official-merch")?.decision.action).toBe("approve");
    expect(run.steps.find((step) => step.id === "blocked-merch")?.decision.action).toBe("reject");
    expect(run.summary).toMatchObject({
      approved: 1,
      blocked: 7,
      redacted: 0,
      settled: 0,
      failed: 0,
      dryRun: true
    });
    expect(memoryStore.listAudit()).toHaveLength(0);
  });

  it("fails before mutation when live devnet is required but the server is in demo mode", async () => {
    await expect(
      runSafeDemo({
        prompt: DEFAULT_SAFE_DEMO_PROMPT,
        dryRun: false,
        requireLive: true
      })
    ).rejects.toThrow("SAFE_DEMO_MODE=false");

    expect(memoryStore.listAudit()).toHaveLength(0);
    expect(memoryStore.listDemoRuns()).toHaveLength(0);
  });
});
