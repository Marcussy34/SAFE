import type { NormalizedPaymentRequest } from "@/lib/types";

export function createRequestFingerprint(request: Pick<NormalizedPaymentRequest, "merchantDomain" | "amountAtomicUnits" | "resourceUrl">): string {
  return `${request.merchantDomain}:${request.amountAtomicUnits}:${request.resourceUrl}`;
}
