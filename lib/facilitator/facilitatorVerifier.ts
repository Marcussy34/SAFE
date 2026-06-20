import type { AllowanceVerificationResult, NormalizedPaymentRequest, X402AllowancePayload } from "@/lib/types";

type VerificationReasonCode =
  | "EXACT_PAYMENT_VERIFIED"
  | "VERSION_MISMATCH"
  | "SCHEME_MISMATCH"
  | "NETWORK_MISMATCH"
  | "AMOUNT_MISMATCH"
  | "ASSET_MISMATCH"
  | "PAY_TO_MISMATCH"
  | "MALFORMED_TRANSACTION"
  | "NO_MATCHING_TRANSFER"
  | "MULTIPLE_MATCHING_TRANSFERS"
  | "INNER_TRANSFER_MISSING";

interface ExpectedPaymentTransfer {
  mint: string;
  amount: string;
  destinationAta: string;
  tokenProgram: "spl-token";
}

function result(
  valid: boolean,
  reasonCode: VerificationReasonCode,
  matchingTransferCount = 0,
  innerTransferVerified = false
): AllowanceVerificationResult {
  return {
    valid,
    reasonCode,
    matchingTransferCount,
    innerTransferVerified
  };
}

function recordFrom(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function stringField(record: Record<string, unknown> | null, key: string): string | null {
  const value = record?.[key];
  return typeof value === "string" ? value : null;
}

function decodeDemoTransaction(transaction: string | null): Record<string, unknown> | null {
  if (!transaction) {
    return null;
  }

  try {
    const decoded = Buffer.from(transaction, "base64").toString("utf8");
    const parsed = recordFrom(JSON.parse(decoded) as unknown);

    if (parsed?.mode !== "demo") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function collectTransferRecords(transaction: Record<string, unknown>): Record<string, unknown>[] {
  const transfer = recordFrom(transaction.transfer);
  const transfers = Array.isArray(transaction.transfers) ? transaction.transfers : [];
  const transferRecords = transfers.flatMap((item) => {
    const transferRecord = recordFrom(item);
    return transferRecord ? [transferRecord] : [];
  });

  return transfer ? [transfer, ...transferRecords] : transferRecords;
}

function matchesExpectedPayment(transfer: Record<string, unknown>, expected: ExpectedPaymentTransfer): boolean {
  return (
    stringField(transfer, "mint") === expected.mint &&
    stringField(transfer, "amount") === expected.amount &&
    stringField(transfer, "destinationAta") === expected.destinationAta &&
    stringField(transfer, "tokenProgram") === expected.tokenProgram
  );
}

export function verifyAllowancePaymentOutcome(
  payload: X402AllowancePayload,
  request: NormalizedPaymentRequest
): AllowanceVerificationResult {
  const payloadRecord = recordFrom(payload);
  const accepted = recordFrom(payloadRecord?.accepted);
  const payloadBody = recordFrom(payloadRecord?.payload);
  const requestRecord = recordFrom(request);
  const requestX402 = recordFrom(requestRecord?.x402);

  if (payloadRecord?.x402Version !== 2) {
    return result(false, "VERSION_MISMATCH");
  }

  if (stringField(accepted, "scheme") !== "exact" || stringField(requestRecord, "scheme") !== "exact") {
    return result(false, "SCHEME_MISMATCH");
  }

  const network = stringField(requestRecord, "network");
  if (!network || stringField(accepted, "network") !== network) {
    return result(false, "NETWORK_MISMATCH");
  }

  const amount = stringField(requestRecord, "amountAtomicUnits");
  if (!amount || stringField(accepted, "amount") !== amount) {
    return result(false, "AMOUNT_MISMATCH");
  }

  const asset = stringField(requestRecord, "assetMint");
  if (!asset || stringField(accepted, "asset") !== asset) {
    return result(false, "ASSET_MISMATCH");
  }

  const payTo = stringField(requestX402, "payTo");
  if (!payTo || stringField(accepted, "payTo") !== payTo) {
    return result(false, "PAY_TO_MISMATCH");
  }

  const transaction = decodeDemoTransaction(stringField(payloadBody, "transaction"));
  if (!transaction) {
    return result(false, "MALFORMED_TRANSACTION");
  }

  const destinationAta = stringField(requestRecord, "recipientAta");
  if (!destinationAta) {
    return result(false, "NO_MATCHING_TRANSFER");
  }

  const matchingTransfers = collectTransferRecords(transaction).filter((transfer) =>
    matchesExpectedPayment(transfer, {
      mint: asset,
      amount,
      destinationAta,
      tokenProgram: "spl-token"
    })
  );

  if (matchingTransfers.length === 0) {
    return result(false, "NO_MATCHING_TRANSFER");
  }

  if (matchingTransfers.length > 1) {
    return result(false, "MULTIPLE_MATCHING_TRANSFERS", matchingTransfers.length);
  }

  if (matchingTransfers[0]?.inner !== true) {
    return result(false, "INNER_TRANSFER_MISSING", 1);
  }

  return result(true, "EXACT_PAYMENT_VERIFIED", 1, true);
}
