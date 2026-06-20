import { randomUUID } from "node:crypto";

import { DEMO_POLICY } from "@/lib/fixtures/demoPolicy";
import type { AuditRecord, NormalizedPaymentRequest, PolicyDecision } from "@/lib/types";

const PII_REASON_CODES = new Set(["PII_REDACTED", "PII_BLOCKED"]);
const DUPLICATE_REASON_CODES = new Set(["DUPLICATE_PAYMENT_REQUEST", "DUPLICATE_RESOURCE_REQUEST"]);

export function createAuditRecord(
  request: NormalizedPaymentRequest,
  decision: PolicyDecision,
  settlementStatus: AuditRecord["settlementStatus"],
  txSignature?: string
): AuditRecord {
  return {
    auditId: `audit_${randomUUID()}`,
    timestamp: new Date().toISOString(),
    policyId: DEMO_POLICY.policyId,
    paymentRequestHash: request.rawRequestHash,
    merchantDomain: request.merchantDomain,
    amountUsdc: request.amountUsdc,
    decision: decision.action,
    reasonCode: decision.reasonCode,
    piiDetected: PII_REASON_CODES.has(decision.reasonCode),
    duplicateDetected: DUPLICATE_REASON_CODES.has(decision.reasonCode),
    settlementStatus,
    txSignature
  };
}
