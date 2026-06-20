import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";
import { verifyAllowancePaymentOutcome } from "@/lib/facilitator/facilitatorVerifier";
import { createLocalX402PaymentRequirements, verifyLocalX402Payment } from "@/lib/facilitator/localX402Facilitator";
import { isLiveSolanaMode } from "@/lib/solana/addresses";
import type { NormalizedPaymentRequest, X402AllowancePayload } from "@/lib/types";

interface FacilitatorRequestBody {
  payload: X402AllowancePayload;
  paymentRequest: NormalizedPaymentRequest;
  paymentRequirements?: PaymentRequirements;
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
    paymentRequest: body.paymentRequest as unknown as NormalizedPaymentRequest,
    paymentRequirements: isRecord(body.paymentRequirements)
      ? (body.paymentRequirements as unknown as PaymentRequirements)
      : undefined
  };
}

export async function POST(request: Request) {
  const body = await readFacilitatorRequestBody(request);

  if (!body) {
    return badRequest("Body must include payload and paymentRequest objects.");
  }

  if (isLiveSolanaMode()) {
    const paymentRequirements =
      body.paymentRequirements ?? (await createLocalX402PaymentRequirements(body.paymentRequest));
    const result = await verifyLocalX402Payment(body.payload as unknown as PaymentPayload, paymentRequirements);
    return Response.json({ result }, { status: result.isValid ? 200 : 400 });
  }

  const result = verifyAllowancePaymentOutcome(body.payload, body.paymentRequest);
  return Response.json({ result }, { status: result.valid ? 200 : 400 });
}
