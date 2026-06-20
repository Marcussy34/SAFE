import type { AuditRecord, NormalizedPaymentRequest, PolicyDecision } from "@/lib/types";
import type { DemoPaymentRequiredBody, DemoPaymentRequirement } from "@/lib/x402/paymentRequirements";

export interface SafePreflightInput {
  requirement: DemoPaymentRequirement;
  agentReason?: string;
}

export interface SafePayInput {
  resourceUrl?: string;
  requirement?: DemoPaymentRequirement;
  agentReason?: string;
  dryRun?: boolean;
}

export interface SafePreflightResult {
  request: NormalizedPaymentRequest;
  decision: PolicyDecision;
}

export interface SafeSettlement {
  settlementStatus: "settled" | "failed";
  txSignature?: string;
  explorerUrl?: string;
  error?: string;
}

export interface SafePaidResourceResult {
  url: string;
  status: number;
  ok: boolean;
  body: unknown;
}

export interface SafePayResult extends SafePreflightResult {
  dryRun: boolean;
  auditRecord?: AuditRecord;
  settlement?: SafeSettlement;
  explorerUrl?: string;
  resource?: SafePaidResourceResult;
}

export interface SafeFetchedChallenge {
  resourceUrl: string;
  status: 402;
  requirement: DemoPaymentRequirement;
  paymentRequired: DemoPaymentRequiredBody | null;
}
