import { safePay } from "@/lib/safe/safePaymentService";
import type { SafeSettlement } from "@/lib/safe/types";
import { memoryStore } from "@/lib/store/memoryStore";
import type { AuditRecord, NormalizedPaymentRequest, PolicyDecision } from "@/lib/types";
import { createDemoPaymentRequirement, type DemoPaymentRequirement, withDemoPaymentAmount } from "@/lib/x402/paymentRequirements";

export interface AgentAttempt {
  label: string;
  request: NormalizedPaymentRequest;
  decision: PolicyDecision;
  auditRecord: AuditRecord;
  settlement?: SafeSettlement;
}

export interface WorldCupAgentResult {
  attempts: AgentAttempt[];
  audit: AuditRecord[];
}

const TASK_ID = "task_matchday_plan_001";

function withAmount(requirement: DemoPaymentRequirement, amountUsdc: number): DemoPaymentRequirement {
  return withDemoPaymentAmount(requirement, amountUsdc);
}

async function evaluateAttempt(
  label: string,
  requirement: DemoPaymentRequirement,
  agentReason?: string
): Promise<AgentAttempt> {
  const result = await safePay({ requirement, agentReason });

  if (!result.auditRecord) {
    throw new Error("Scripted agent payment did not produce an audit record.");
  }

  return {
    label,
    request: result.decision.sanitizedRequest ?? result.request,
    decision: result.decision,
    auditRecord: result.auditRecord,
    settlement: result.settlement
  };
}

export async function runWorldCupAgentScenario(): Promise<WorldCupAgentResult> {
  memoryStore.clearAudit();
  memoryStore.resetReplay();

  const statsRequirement = createDemoPaymentRequirement("stats-api.demo", "/live/argentina-vs-japan", TASK_ID);
  const foodRequirement = createDemoPaymentRequirement("food-voucher.demo", "/voucher/halftime", TASK_ID);
  const overLimitRequirement = withAmount(createDemoPaymentRequirement("stats-api.demo", "/live/premium-feed", TASK_ID), 0.5);
  const piiRequirement = createDemoPaymentRequirement("stats-api.demo", "/live/metadata-leak", TASK_ID);

  const attempts = [
    await evaluateAttempt("POLICY_OK approved stats", statsRequirement),
    await evaluateAttempt("POLICY_OK approved transit", createDemoPaymentRequirement("transit-api.demo", "/route/stadium", TASK_ID)),
    await evaluateAttempt("POLICY_OK approved food voucher", foodRequirement),
    await evaluateAttempt("MERCHANT_NOT_ALLOWLISTED blocked fake merch", createDemoPaymentRequirement("fake-merch.demo", "/jersey", TASK_ID)),
    await evaluateAttempt("DUPLICATE_PAYMENT_REQUEST blocked duplicate stats", statsRequirement),
    await evaluateAttempt("AMOUNT_OVER_PER_PAYMENT_CAP blocked over-limit request", overLimitRequirement),
    await evaluateAttempt("PII_REDACTED redacted metadata leak", piiRequirement, "Email marcus@example.com at Hotel Central for shuttle pickup.")
  ];

  return {
    attempts,
    audit: memoryStore.listAudit()
  };
}
