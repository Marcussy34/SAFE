import { verifyAllowancePaymentOutcome } from "@/lib/facilitator/facilitatorVerifier";
import type { NormalizedPaymentRequest, X402AllowancePayload } from "@/lib/types";

interface FacilitatorRequestBody {
  payload: X402AllowancePayload;
  paymentRequest: NormalizedPaymentRequest;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function badRequest(error: string) {
  return Response.json({ error }, { status: 400 });
}

async function readFacilitatorRequestBody(request: Request): Promise<FacilitatorRequestBody | null> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (!isRecord(body) || !isRecord(body.payload) || !isRecord(body.paymentRequest)) {
    return null;
  }

  return {
    payload: body.payload as unknown as X402AllowancePayload,
    paymentRequest: body.paymentRequest as unknown as NormalizedPaymentRequest
  };
}

export async function POST(request: Request) {
  const body = await readFacilitatorRequestBody(request);

  if (!body) {
    return badRequest("Body must include payload and paymentRequest objects.");
  }

  const result = verifyAllowancePaymentOutcome(body.payload, body.paymentRequest);
  return Response.json({ result }, { status: result.valid ? 200 : 400 });
}
