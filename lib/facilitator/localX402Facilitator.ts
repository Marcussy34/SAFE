import { createHash } from "node:crypto";
import { x402Facilitator } from "@x402/core/facilitator";
import type { Network, PaymentPayload, PaymentRequirements, SettleResponse, VerifyResponse } from "@x402/core/types";
import { ExactSvmScheme } from "@x402/svm/exact/facilitator";
import { SettlementCache, toFacilitatorSvmSigner } from "@x402/svm";
import { SUBSCRIPTIONS_PROGRAM_ADDRESS } from "@solana/subscriptions";
import type { MessagePartialSigner, TransactionSigner } from "@solana/kit";
import { SOLANA_DEVNET_CHAIN_ID } from "@/lib/constants";
import { getSolanaRpcUrl, type SolanaEnv } from "@/lib/solana/addresses";
import { signerFromBase58Env } from "@/lib/solana/liveSettlement";
import type { NormalizedPaymentRequest } from "@/lib/types";

interface CachedFacilitator {
  cacheKey: string;
  facilitator: x402Facilitator;
  feePayer: string;
}

let cachedFacilitator: CachedFacilitator | null = null;

function signerCacheKey(env: SolanaEnv): string {
  const secret = env.SAFE_FACILITATOR_SECRET_BASE58?.trim();
  const secretHash = secret ? createHash("sha256").update(secret).digest("hex") : "missing";
  return [secretHash, getSolanaRpcUrl(env)].join(":");
}

function toX402Network(network: string): Network {
  if (!network.includes(":")) {
    throw new Error(`Invalid x402 network identifier: ${network}`);
  }

  return network as Network;
}

async function getFacilitatorSigner(env: SolanaEnv) {
  const signer = await signerFromBase58Env("SAFE_FACILITATOR_SECRET_BASE58", env);
  return signer as TransactionSigner & MessagePartialSigner;
}

export async function getLocalX402Facilitator(env: SolanaEnv = process.env): Promise<CachedFacilitator> {
  const cacheKey = signerCacheKey(env);

  if (cachedFacilitator?.cacheKey === cacheKey) {
    return cachedFacilitator;
  }

  const signer = await getFacilitatorSigner(env);
  const facilitatorSigner = toFacilitatorSvmSigner(signer, { defaultRpcUrl: getSolanaRpcUrl(env) });
  const scheme = new ExactSvmScheme(facilitatorSigner, new SettlementCache(), {
    enableSmartWalletVerification: true,
    smartWalletAllowedPrograms: [SUBSCRIPTIONS_PROGRAM_ADDRESS]
  });
  const facilitator = new x402Facilitator().register(SOLANA_DEVNET_CHAIN_ID, scheme);

  cachedFacilitator = {
    cacheKey,
    facilitator,
    feePayer: signer.address
  };

  return cachedFacilitator;
}

export async function getLocalX402FeePayer(env: SolanaEnv = process.env): Promise<string> {
  return (await getLocalX402Facilitator(env)).feePayer;
}

export async function createLocalX402PaymentRequirements(
  request: NormalizedPaymentRequest,
  env: SolanaEnv = process.env
): Promise<PaymentRequirements> {
  const feePayer = await getLocalX402FeePayer(env);

  return {
    scheme: "exact",
    network: toX402Network(request.network),
    amount: request.amountAtomicUnits,
    asset: request.assetMint,
    payTo: request.recipientAddress,
    maxTimeoutSeconds: 60,
    extra: {
      feePayer,
      memo: request.x402.memo ?? `safe_${request.rawRequestHash.slice(0, 24)}`
    }
  };
}

export async function verifyLocalX402Payment(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
  env: SolanaEnv = process.env
): Promise<VerifyResponse> {
  const { facilitator } = await getLocalX402Facilitator(env);
  return facilitator.verify(paymentPayload, paymentRequirements);
}

export async function settleLocalX402Payment(
  paymentPayload: PaymentPayload,
  paymentRequirements: PaymentRequirements,
  env: SolanaEnv = process.env
): Promise<SettleResponse> {
  const { facilitator } = await getLocalX402Facilitator(env);
  return facilitator.settle(paymentPayload, paymentRequirements);
}
