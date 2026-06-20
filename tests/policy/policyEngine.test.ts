import { describe, expect, it } from "vitest";
import { DEMO_INTENT, DEMO_POLICY } from "@/lib/fixtures/demoPolicy";
import { MERCHANTS } from "@/lib/fixtures/merchants";
import { evaluatePolicy } from "@/lib/policy/policyEngine";
import type { Ap2StyleIntent, NormalizedPaymentRequest, SpendPolicy } from "@/lib/types";

function request(overrides: Partial<NormalizedPaymentRequest> = {}): NormalizedPaymentRequest {
  return {
    requestId: "req_stats_001",
    rail: "x402_solana_allowance_devnet",
    scheme: "exact",
    network: DEMO_POLICY.network,
    amountUsdc: 0.02,
    amountAtomicUnits: "20000",
    token: "DEMO_USD",
    assetMint: DEMO_POLICY.allowance.tokenMint,
    recipientAddress: MERCHANTS["stats-api.demo"].recipientAddress,
    recipientAta: MERCHANTS["stats-api.demo"].recipientAta,
    merchantDomain: "stats-api.demo",
    merchantName: "World Cup Stats API",
    category: "match_data",
    resourceUrl: "https://stats-api.demo/live/argentina-vs-japan",
    description: "Live match stats",
    reason: "Agent needs live stats for match dashboard",
    rawRequestHash: "hash-req-stats-001",
    taskId: "task_matchday_plan_001",
    intentId: DEMO_INTENT.intentId,
    userIntent: DEMO_INTENT.userIntent,
    x402: {
      paymentRequiredStatus: 402,
      payTo: MERCHANTS["stats-api.demo"].recipientAddress,
      feePayer: "AHbgsgxvHh66fYHVrogdJjEUcaM4RDTvHBN29BeYYsUE",
      memo: "invoice_match_stats_001",
      facilitatorUrl: "https://safe.local/facilitator"
    },
    allowanceSettlement: {
      delegationType: "fixed",
      delegationPda: DEMO_POLICY.allowance.delegationPda,
      instruction: "transferFixed",
      delegatee: DEMO_POLICY.allowance.delegatee
    },
    ...overrides
  };
}

function policy(overrides: Partial<SpendPolicy> = {}): SpendPolicy {
  return {
    ...DEMO_POLICY,
    ...overrides
  };
}

function intent(overrides: Partial<Ap2StyleIntent> = {}): Ap2StyleIntent {
  return {
    ...DEMO_INTENT,
    ...overrides
  };
}

describe("evaluatePolicy", () => {
  it("approves a trusted in-policy request", () => {
    const decision = evaluatePolicy(request(), DEMO_POLICY, DEMO_INTENT, { duplicate: false });

    expect(decision.action).toBe("approve");
    expect(decision.reasonCode).toBe("POLICY_OK");
    expect(decision.x402PaymentStatus).toBe("not_signed");
  });

  it("rejects a blocked merchant", () => {
    const decision = evaluatePolicy(
      request({ merchantDomain: "fake-merch.demo", category: "merch", amountUsdc: 0.05 }),
      DEMO_POLICY,
      DEMO_INTENT,
      { duplicate: false }
    );

    expect(decision.action).toBe("reject");
    expect(decision.reasonCode).toBe("MERCHANT_NOT_ALLOWLISTED");
  });

  it("rejects over-limit requests before signing", () => {
    const decision = evaluatePolicy(request({ amountUsdc: 0.5, amountAtomicUnits: "500000" }), DEMO_POLICY, DEMO_INTENT, {
      duplicate: false
    });

    expect(decision.action).toBe("reject");
    expect(decision.reasonCode).toBe("AMOUNT_OVER_PER_PAYMENT_CAP");
    expect(decision.x402PaymentStatus).toBe("not_signed");
  });

  it("rejects requests that exceed remaining allowance atomic units", () => {
    const decision = evaluatePolicy(
      request({ amountUsdc: 0.02, amountAtomicUnits: "6000000" }),
      DEMO_POLICY,
      DEMO_INTENT,
      { duplicate: false }
    );

    expect(decision.action).toBe("reject");
    expect(decision.reasonCode).toBe("ALLOWANCE_CAP_EXCEEDED");
  });

  it("rejects duplicate requests", () => {
    const decision = evaluatePolicy(request(), DEMO_POLICY, DEMO_INTENT, { duplicate: true });

    expect(decision.action).toBe("reject");
    expect(decision.reasonCode).toBe("DUPLICATE_PAYMENT_REQUEST");
  });

  it("rejects duplicate resource fingerprints when policy requires it", () => {
    const decision = evaluatePolicy(request({ rawRequestHash: "hash-req-stats-002" }), DEMO_POLICY, DEMO_INTENT, {
      duplicate: false,
      duplicateFingerprint: true
    });

    expect(decision.action).toBe("reject");
    expect(decision.reasonCode).toBe("DUPLICATE_RESOURCE_REQUEST");
  });

  it("rejects recipient mismatches before approval", () => {
    const decision = evaluatePolicy(request({ x402: { ...request().x402, payTo: MERCHANTS["transit-api.demo"].recipientAddress } }), DEMO_POLICY, DEMO_INTENT, {
      duplicate: false
    });

    expect(decision.action).toBe("reject");
    expect(decision.reasonCode).toBe("RECIPIENT_MISMATCH");
  });

  it("rejects allowance delegation mismatches before approval", () => {
    const decision = evaluatePolicy(
      request({ allowanceSettlement: { ...request().allowanceSettlement, delegatee: MERCHANTS["transit-api.demo"].recipientAddress } }),
      DEMO_POLICY,
      DEMO_INTENT,
      { duplicate: false }
    );

    expect(decision.action).toBe("reject");
    expect(decision.reasonCode).toBe("ALLOWANCE_DELEGATION_MISMATCH");
  });

  it("redacts sensitive metadata when policy allows redaction", () => {
    const decision = evaluatePolicy(
      request({ reason: "Email marcus@example.com at Hotel Central for shuttle pickup." }),
      DEMO_POLICY,
      DEMO_INTENT,
      { duplicate: false }
    );

    expect(decision.action).toBe("redact_and_approve");
    expect(decision.reasonCode).toBe("PII_REDACTED");
    expect(decision.sanitizedRequest?.reason).toContain("[REDACTED_EMAIL]");
    expect(decision.sanitizedRequest?.reason).toContain("[REDACTED_HOTEL]");
  });

  it("blocks sensitive metadata when policy mode is block", () => {
    const decision = evaluatePolicy(
      request({ reason: "Email marcus@example.com at Hotel Central for shuttle pickup." }),
      policy({ piiPolicy: { ...DEMO_POLICY.piiPolicy, mode: "block" } }),
      DEMO_INTENT,
      { duplicate: false }
    );

    expect(decision.action).toBe("reject");
    expect(decision.reasonCode).toBe("PII_BLOCKED");
  });

  it("rejects expired policy and allowance before approval", () => {
    const expired = "2020-01-01T00:00:00Z";

    const expiredPolicyDecision = evaluatePolicy(request(), policy({ expiresAt: expired }), DEMO_INTENT, { duplicate: false });
    const expiredAllowanceDecision = evaluatePolicy(
      request(),
      policy({ allowance: { ...DEMO_POLICY.allowance, expiresAt: expired } }),
      DEMO_INTENT,
      { duplicate: false }
    );

    expect(expiredPolicyDecision.reasonCode).toBe("POLICY_EXPIRED");
    expect(expiredAllowanceDecision.reasonCode).toBe("ALLOWANCE_EXPIRED");
  });

  it("rejects rail, scheme, and network mismatches", () => {
    expect(
      evaluatePolicy(request({ rail: "bad_rail" as NormalizedPaymentRequest["rail"] }), DEMO_POLICY, DEMO_INTENT, {
        duplicate: false
      }).reasonCode
    ).toBe("RAIL_NOT_ALLOWED");
    expect(
      evaluatePolicy(request({ scheme: "bad_scheme" as NormalizedPaymentRequest["scheme"] }), DEMO_POLICY, DEMO_INTENT, {
        duplicate: false
      }).reasonCode
    ).toBe("SCHEME_NOT_ALLOWED");
    expect(evaluatePolicy(request({ network: "solana:bad" }), DEMO_POLICY, DEMO_INTENT, { duplicate: false }).reasonCode).toBe(
      "NETWORK_MISMATCH"
    );
  });

  it("rejects AP2-style intent scope mismatches", () => {
    const decision = evaluatePolicy(request({ intentId: "intent_other" }), DEMO_POLICY, intent(), { duplicate: false });

    expect(decision.action).toBe("reject");
    expect(decision.reasonCode).toBe("INTENT_SCOPE_MISMATCH");
  });
});
