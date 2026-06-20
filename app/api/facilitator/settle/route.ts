import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";
import { verifyAllowancePaymentOutcome } from "@/lib/facilitator/facilitatorVerifier";
import {
  createLocalX402PaymentRequirements,
  settleLocalX402Payment,
  verifyLocalX402Payment
} from "@/lib/facilitator/localX402Facilitator";
import { isLiveSolanaMode, solanaExplorerTxUrl } from "@/lib/solana/addresses";
import type { AllowanceVerificationResult, NormalizedPaymentRequest, X402AllowancePayload } from "@/lib/types";

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

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function demoSignatureFor(request: NormalizedPaymentRequest): string {
  const seed =
    stringValue(request.rawRequestHash) ||
    `${stringValue(request.requestId)}:${stringValue(request.amountAtomicUnits)}:${stringValue(request.recipientAta)}`;
  return `demo_sig_${seed.replace(/[^A-Za-z0-9]/g, "").slice(0, 24) || "verified"}`;
}

export function createSettlementResponse(result: AllowanceVerificationResult, paymentRequest: NormalizedPaymentRequest) {
  if (!result.valid) {
    return Response.json({ result, settlementStatus: "failed" }, { status: 400 });
  }

  const txSignature = demoSignatureFor(paymentRequest);

  return Response.json({
    result: {
      ...result,
      txSignature
    },
    settlementStatus: "settled",
    explorerUrl: solanaExplorerTxUrl(txSignature)
  });
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
    const verification = await verifyLocalX402Payment(body.payload as unknown as PaymentPayload, paymentRequirements);

    if (!verification.isValid) {
      return Response.json({ result: verification, settlementStatus: "failed" }, { status: 400 });
    }

    const settlement = await settleLocalX402Payment(body.payload as unknown as PaymentPayload, paymentRequirements);
    const status = settlement.success ? 200 : 400;

    return Response.json(
      {
        result: verification,
        settlement,
        settlementStatus: settlement.success ? "settled" : "failed",
        explorerUrl: settlement.success ? solanaExplorerTxUrl(settlement.transaction) : undefined
      },
      { status }
    );
  }

  const result = verifyAllowancePaymentOutcome(body.payload, body.paymentRequest);
  return createSettlementResponse(result, body.paymentRequest);
}
