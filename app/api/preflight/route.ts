import { createAuditRecord } from "@/lib/audit/auditLog";
import { evaluatePolicy } from "@/lib/policy/policyEngine";
import { createRequestFingerprint } from "@/lib/policy/requestFingerprint";
import { memoryStore } from "@/lib/store/memoryStore";
import { normalizePaymentRequirement, type DemoPaymentRequirement } from "@/lib/x402/paymentRequirements";

interface PreflightBody {
  requirement?: DemoPaymentRequirement;
}

function badRequest(error: string) {
  return Response.json({ error }, { status: 400 });
}

export async function POST(request: Request) {
  let body: PreflightBody;

  try {
    body = (await request.json()) as PreflightBody;
  } catch {
    return badRequest("Malformed JSON body.");
  }

  if (!body || typeof body !== "object" || !body.requirement) {
    return badRequest("Body must include a payment requirement.");
  }

  try {
    const normalized = normalizePaymentRequirement(body.requirement);
    const replay = memoryStore.replayGuard.checkAndRemember(
      createRequestFingerprint(normalized),
      normalized.rawRequestHash,
      memoryStore.policy.replayPolicy.idempotencyWindowSeconds
    );
    const decision = evaluatePolicy(normalized, memoryStore.policy, memoryStore.intent, replay);
    const auditRecord = memoryStore.appendAudit(createAuditRecord(normalized, decision, "not_attempted"));

    return Response.json({ normalized, decision, auditRecord });
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Invalid payment requirement.");
  }
}
