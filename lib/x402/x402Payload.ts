import type { NormalizedPaymentRequest, X402AllowancePayload } from "@/lib/types";

export interface DemoX402Transfer {
  mint: string;
  amount: string;
  destinationAta: string;
  tokenProgram: "spl-token";
  inner: boolean;
}

export interface DemoX402Transaction {
  mode: "demo";
  instruction: NormalizedPaymentRequest["allowanceSettlement"]["instruction"];
  delegationPda: string;
  delegatee: string;
  transfer: DemoX402Transfer;
}

function encodeDemoTransaction(transaction: DemoX402Transaction): string {
  return Buffer.from(JSON.stringify(transaction), "utf8").toString("base64");
}

export function createDemoX402AllowancePayload(request: NormalizedPaymentRequest): X402AllowancePayload {
  const transaction: DemoX402Transaction = {
    mode: "demo",
    instruction: request.allowanceSettlement.instruction,
    delegationPda: request.allowanceSettlement.delegationPda,
    delegatee: request.allowanceSettlement.delegatee,
    transfer: {
      mint: request.assetMint,
      amount: request.amountAtomicUnits,
      destinationAta: request.recipientAta,
      tokenProgram: "spl-token",
      inner: true
    }
  };

  return {
    x402Version: 2,
    accepted: {
      scheme: "exact",
      network: request.network,
      amount: request.amountAtomicUnits,
      asset: request.assetMint,
      payTo: request.x402.payTo,
      extra: {
        feePayer: request.x402.feePayer,
        memo: request.x402.memo
      }
    },
    payload: {
      transaction: encodeDemoTransaction(transaction)
    }
  };
}
