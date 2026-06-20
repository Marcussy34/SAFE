import {
  address,
  appendTransactionMessageInstructions,
  assertIsTransactionWithBlockhashLifetime,
  createKeyPairSignerFromBytes,
  createKeyPairSignerFromPrivateKeyBytes,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  getBase58Encoder,
  getSignatureFromTransaction,
  partiallySignTransactionMessageWithSigners,
  pipe,
  prependTransactionMessageInstruction,
  sendAndConfirmTransactionFactory,
  setTransactionMessageFeePayer,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  type Address,
  type Instruction,
  type Rpc,
  type SolanaRpcApi,
  type TransactionSigner
} from "@solana/kit";
import {
  getSetComputeUnitLimitInstruction,
  setTransactionMessageComputeUnitPrice
} from "@solana-program/compute-budget";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  TOKEN_PROGRAM_ADDRESS
} from "@solana-program/token";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";
import {
  fetchMaybeFixedDelegation,
  fetchMaybeSubscriptionAuthority,
  findFixedDelegationPda,
  findSubscriptionAuthorityPda,
  getCreateFixedDelegationInstruction,
  getInitSubscriptionAuthorityInstruction,
  getTransferFixedInstruction,
  SUBSCRIPTIONS_PROGRAM_ADDRESS
} from "@solana/subscriptions";
import { DEMO_MINT_PLACEHOLDER } from "@/lib/constants";
import { solanaExplorerTxUrl, getSolanaRpcSubscriptionsUrl, getSolanaRpcUrl, requireEnv, type SolanaEnv } from "@/lib/solana/addresses";
import type { AllowanceDelegation, NormalizedPaymentRequest, SpendPolicy } from "@/lib/types";

export const DEFAULT_ALLOWANCE_AMOUNT_ATOMIC_UNITS = "5000000";
export const DEFAULT_DELEGATION_NONCE = 1n;
const PUBLIC_X402_COMPUTE_UNIT_LIMIT = 200_000;
const PUBLIC_X402_COMPUTE_UNIT_PRICE_MICROLAMPORTS = 1;
const MEMO_PROGRAM_ADDRESS = address("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export interface LiveAllowanceContext {
  mint: Address;
  tokenProgram: Address;
  userSigner: TransactionSigner;
  delegateeSigner: TransactionSigner;
  facilitatorSigner: TransactionSigner;
  subscriptionAuthorityPda: Address;
  fixedDelegationPda: Address;
  delegatorAta: Address;
  nonce: bigint;
  amountAtomicUnits: bigint;
  expiryTs: bigint;
}

export interface DevnetBalanceRow {
  label: string;
  address: string;
  sol: string;
  usdcAta: string;
  usdc: string;
}

export interface LiveSetupResult {
  subscriptionAuthorityPda: string;
  fixedDelegationPda: string;
  delegatorAta: string;
  delegatee: string;
  mint: string;
  initSignature?: string;
  createSignature?: string;
  initExplorerUrl?: string;
  createExplorerUrl?: string;
  skippedInit: boolean;
  skippedCreate: boolean;
}

export interface LiveSettlementResult {
  settlementStatus: "settled";
  txSignature: string;
  explorerUrl: string;
  recipientAta: string;
}

export interface PublicX402AllowancePayloadResult {
  paymentPayload: PaymentPayload;
  recipientAta: string;
  transactionBase64: string;
}

function atomicUnitsFromEnv(name: string, fallback: string, env: SolanaEnv): bigint {
  const rawValue = env[name]?.trim() || fallback;
  const value = BigInt(rawValue);

  if (value <= 0n) {
    throw new Error(`${name} must be a positive integer amount in token atomic units.`);
  }

  return value;
}

function bigintFromEnv(name: string, fallback: bigint, env: SolanaEnv): bigint {
  const rawValue = env[name]?.trim();
  return rawValue ? BigInt(rawValue) : fallback;
}

function unixSecondsFromEnv(name: string, env: SolanaEnv): bigint {
  const rawValue = env[name]?.trim();

  if (rawValue) {
    const value = BigInt(rawValue);

    if (value <= BigInt(Math.floor(Date.now() / 1000))) {
      throw new Error(`${name} must be a future Unix timestamp in seconds.`);
    }

    return value;
  }

  return BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60);
}

export function hasLiveSignerEnv(env: SolanaEnv = process.env): boolean {
  return Boolean(
    env.SAFE_USER_SIGNER_BASE58?.trim() &&
      env.SAFE_SESSION_SECRET_BASE58?.trim() &&
      env.SAFE_FACILITATOR_SECRET_BASE58?.trim()
  );
}

export async function signerFromBase58Env(name: string, env: SolanaEnv = process.env): Promise<TransactionSigner> {
  const secret = requireEnv(name, env);
  const secretBytes = getBase58Encoder().encode(secret);

  if (secretBytes.length === 64) {
    return createKeyPairSignerFromBytes(secretBytes);
  }

  if (secretBytes.length === 32) {
    return createKeyPairSignerFromPrivateKeyBytes(secretBytes);
  }

  throw new Error(`${name} must decode to a 32-byte private key or 64-byte Solana keypair.`);
}

export async function getLiveAllowanceContext(env: SolanaEnv = process.env): Promise<LiveAllowanceContext> {
  const mint = address(env.SAFE_DEMO_MINT?.trim() || DEMO_MINT_PLACEHOLDER);
  const tokenProgram = TOKEN_PROGRAM_ADDRESS;
  const userSigner = await signerFromBase58Env("SAFE_USER_SIGNER_BASE58", env);
  const delegateeSigner = await signerFromBase58Env("SAFE_SESSION_SECRET_BASE58", env);
  const facilitatorSigner = await signerFromBase58Env("SAFE_FACILITATOR_SECRET_BASE58", env);
  const nonce = bigintFromEnv("SAFE_DELEGATION_NONCE", DEFAULT_DELEGATION_NONCE, env);
  const amountAtomicUnits = atomicUnitsFromEnv(
    "SAFE_ALLOWANCE_AMOUNT_ATOMIC_UNITS",
    DEFAULT_ALLOWANCE_AMOUNT_ATOMIC_UNITS,
    env
  );
  const expiryTs = unixSecondsFromEnv("SAFE_ALLOWANCE_EXPIRY_TS", env);
  const [subscriptionAuthorityPda] = await findSubscriptionAuthorityPda({ tokenMint: mint, user: userSigner.address });
  const [fixedDelegationPda] = await findFixedDelegationPda({
    delegatee: delegateeSigner.address,
    delegator: userSigner.address,
    nonce,
    subscriptionAuthority: subscriptionAuthorityPda
  });
  const [delegatorAta] = await findAssociatedTokenPda({
    mint,
    owner: userSigner.address,
    tokenProgram
  });

  return {
    mint,
    tokenProgram,
    userSigner,
    delegateeSigner,
    facilitatorSigner,
    subscriptionAuthorityPda,
    fixedDelegationPda,
    delegatorAta,
    nonce,
    amountAtomicUnits,
    expiryTs
  };
}

export function liveAllowanceDelegationFromContext(context: LiveAllowanceContext): AllowanceDelegation {
  return {
    type: "fixed",
    delegationPda: context.fixedDelegationPda,
    subscriptionAuthorityPda: context.subscriptionAuthorityPda,
    delegatee: context.delegateeSigner.address,
    delegatorAta: context.delegatorAta,
    tokenMint: context.mint,
    remainingAtomicUnits: context.amountAtomicUnits.toString(),
    expiresAt: new Date(Number(context.expiryTs) * 1000).toISOString()
  };
}

export async function applyLiveAllowanceToRequest(
  request: NormalizedPaymentRequest,
  env: SolanaEnv = process.env
): Promise<NormalizedPaymentRequest> {
  const context = await getLiveAllowanceContext(env);
  const recipientOwner = address(request.recipientAddress);
  const [recipientAta] = await findAssociatedTokenPda({
    mint: context.mint,
    owner: recipientOwner,
    tokenProgram: context.tokenProgram
  });

  return {
    ...request,
    token: "USDC",
    assetMint: context.mint,
    recipientAta,
    allowanceSettlement: {
      delegationType: "fixed",
      delegationPda: context.fixedDelegationPda,
      instruction: "transferFixed",
      delegatee: context.delegateeSigner.address
    }
  };
}

export async function livePolicyFromContext(policy: SpendPolicy, env: SolanaEnv = process.env): Promise<SpendPolicy> {
  const context = await getLiveAllowanceContext(env);

  return {
    ...policy,
    allowance: liveAllowanceDelegationFromContext(context)
  };
}

function createRpc(env: SolanaEnv): Rpc<SolanaRpcApi> {
  return createSolanaRpc(getSolanaRpcUrl(env));
}

async function sendLiveTransaction(
  instructions: Instruction[],
  feePayer: TransactionSigner,
  env: SolanaEnv
): Promise<string> {
  const rpc = createRpc(env);
  const rpcSubscriptions = createSolanaRpcSubscriptions(getSolanaRpcSubscriptionsUrl(env));
  const latestBlockhash = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const messageWithFeePayer = setTransactionMessageFeePayerSigner(feePayer, createTransactionMessage({ version: 0 }));
  const messageWithLifetime = setTransactionMessageLifetimeUsingBlockhash(latestBlockhash.value, messageWithFeePayer);
  const message = appendTransactionMessageInstructions(instructions, messageWithLifetime);

  const signedTransaction = await signTransactionMessageWithSigners(message);
  assertIsTransactionWithBlockhashLifetime(signedTransaction);

  const signature = getSignatureFromTransaction(signedTransaction);
  const sendAndConfirmTransaction = sendAndConfirmTransactionFactory({ rpc, rpcSubscriptions });

  await sendAndConfirmTransaction(signedTransaction, {
    commitment: "confirmed",
    maxRetries: 3n,
    skipPreflight: false
  });

  return signature;
}

async function readSubscriptionAuthorityInitId(rpc: Rpc<SolanaRpcApi>, context: LiveAllowanceContext): Promise<bigint> {
  const subscriptionAuthority = await fetchMaybeSubscriptionAuthority(rpc, context.subscriptionAuthorityPda);

  if (!subscriptionAuthority.exists) {
    throw new Error("Subscription authority is not initialized.");
  }

  return subscriptionAuthority.data.initId;
}

export async function setupFixedAllowance(env: SolanaEnv = process.env): Promise<LiveSetupResult> {
  const context = await getLiveAllowanceContext(env);
  const rpc = createRpc(env);
  const subscriptionAuthority = await fetchMaybeSubscriptionAuthority(rpc, context.subscriptionAuthorityPda);
  let initSignature: string | undefined;

  if (!subscriptionAuthority.exists) {
    const initInstruction = getInitSubscriptionAuthorityInstruction({
      owner: context.userSigner,
      subscriptionAuthority: context.subscriptionAuthorityPda,
      tokenMint: context.mint,
      tokenProgram: context.tokenProgram,
      userAta: context.delegatorAta
    });

    initSignature = await sendLiveTransaction([initInstruction], context.userSigner, env);
  }

  const expectedSubscriptionAuthorityInitId = subscriptionAuthority.exists
    ? subscriptionAuthority.data.initId
    : await readSubscriptionAuthorityInitId(rpc, context);
  const fixedDelegation = await fetchMaybeFixedDelegation(rpc, context.fixedDelegationPda);
  let createSignature: string | undefined;

  if (!fixedDelegation.exists) {
    const createInstruction = getCreateFixedDelegationInstruction({
      delegatee: context.delegateeSigner.address,
      delegationAccount: context.fixedDelegationPda,
      delegator: context.userSigner,
      fixedDelegation: {
        amount: context.amountAtomicUnits,
        expiryTs: context.expiryTs,
        expectedSubscriptionAuthorityInitId,
        nonce: context.nonce
      },
      subscriptionAuthority: context.subscriptionAuthorityPda
    });

    createSignature = await sendLiveTransaction([createInstruction], context.userSigner, env);
  }

  return {
    subscriptionAuthorityPda: context.subscriptionAuthorityPda,
    fixedDelegationPda: context.fixedDelegationPda,
    delegatorAta: context.delegatorAta,
    delegatee: context.delegateeSigner.address,
    mint: context.mint,
    initSignature,
    createSignature,
    initExplorerUrl: initSignature ? solanaExplorerTxUrl(initSignature) : undefined,
    createExplorerUrl: createSignature ? solanaExplorerTxUrl(createSignature) : undefined,
    skippedInit: subscriptionAuthority.exists,
    skippedCreate: fixedDelegation.exists
  };
}

export async function settleLiveAllowancePayment(
  request: NormalizedPaymentRequest,
  env: SolanaEnv = process.env
): Promise<LiveSettlementResult> {
  const context = await getLiveAllowanceContext(env);
  const amount = BigInt(request.amountAtomicUnits);
  const recipientOwner = address(request.recipientAddress);
  const [recipientAta] = await findAssociatedTokenPda({
    mint: context.mint,
    owner: recipientOwner,
    tokenProgram: context.tokenProgram
  });
  const createRecipientAtaInstruction = getCreateAssociatedTokenIdempotentInstruction({
    payer: context.facilitatorSigner,
    ata: recipientAta,
    owner: recipientOwner,
    mint: context.mint,
    tokenProgram: context.tokenProgram
  });
  const transferInstruction = getTransferFixedInstruction({
    delegationPda: context.fixedDelegationPda,
    subscriptionAuthority: context.subscriptionAuthorityPda,
    delegatorAta: context.delegatorAta,
    receiverAta: recipientAta,
    tokenMint: context.mint,
    tokenProgram: context.tokenProgram,
    delegatee: context.delegateeSigner,
    transferData: {
      amount,
      delegator: context.userSigner.address,
      mint: context.mint
    }
  });
  const signature = await sendLiveTransaction(
    [createRecipientAtaInstruction, transferInstruction],
    context.facilitatorSigner,
    env
  );

  return {
    settlementStatus: "settled",
    txSignature: signature,
    explorerUrl: solanaExplorerTxUrl(signature),
    recipientAta
  };
}

export async function buildPublicX402AllowancePayload(
  request: NormalizedPaymentRequest,
  paymentRequirements: PaymentRequirements,
  env: SolanaEnv = process.env
): Promise<PublicX402AllowancePayloadResult> {
  const context = await getLiveAllowanceContext(env);
  const feePayer = paymentRequirements.extra?.feePayer;

  if (typeof feePayer !== "string" || !feePayer.trim()) {
    throw new Error("Public x402 SVM verification requires paymentRequirements.extra.feePayer.");
  }

  const amount = BigInt(request.amountAtomicUnits);
  const recipientOwner = address(request.recipientAddress);
  const [recipientAta] = await findAssociatedTokenPda({
    mint: context.mint,
    owner: recipientOwner,
    tokenProgram: context.tokenProgram
  });
  const transferInstruction = getTransferFixedInstruction({
    delegationPda: context.fixedDelegationPda,
    subscriptionAuthority: context.subscriptionAuthorityPda,
    delegatorAta: context.delegatorAta,
    receiverAta: recipientAta,
    tokenMint: context.mint,
    tokenProgram: context.tokenProgram,
    delegatee: context.delegateeSigner,
    transferData: {
      amount,
      delegator: context.userSigner.address,
      mint: context.mint
    }
  });
  const memoText = typeof paymentRequirements.extra?.memo === "string" ? paymentRequirements.extra.memo : request.x402.memo;
  const memoInstruction: Instruction = {
    programAddress: MEMO_PROGRAM_ADDRESS,
    accounts: [],
    data: new TextEncoder().encode(memoText)
  };
  const rpc = createRpc(env);
  const latestBlockhash = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const message = pipe(
    createTransactionMessage({ version: 0 }),
    (transactionMessage) =>
      setTransactionMessageComputeUnitPrice(PUBLIC_X402_COMPUTE_UNIT_PRICE_MICROLAMPORTS, transactionMessage),
    (transactionMessage) => setTransactionMessageFeePayer(address(feePayer), transactionMessage),
    (transactionMessage) =>
      prependTransactionMessageInstruction(
        getSetComputeUnitLimitInstruction({ units: PUBLIC_X402_COMPUTE_UNIT_LIMIT }),
        transactionMessage
      ),
    (transactionMessage) => appendTransactionMessageInstructions([transferInstruction, memoInstruction], transactionMessage),
    (transactionMessage) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash.value, transactionMessage)
  );
  const partiallySignedTransaction = await partiallySignTransactionMessageWithSigners(message);
  const transactionBase64 = getBase64EncodedWireTransaction(partiallySignedTransaction);

  return {
    paymentPayload: {
      x402Version: 2,
      resource: {
        url: request.resourceUrl,
        description: request.description,
        mimeType: "application/json"
      },
      accepted: paymentRequirements,
      payload: {
        transaction: transactionBase64
      }
    },
    recipientAta,
    transactionBase64
  };
}

export async function getDevnetBalances(env: SolanaEnv = process.env): Promise<DevnetBalanceRow[]> {
  const context = await getLiveAllowanceContext(env);
  const rpc = createRpc(env);
  const rows: Array<[string, TransactionSigner]> = [
    ["user/delegator", context.userSigner],
    ["agent/delegatee", context.delegateeSigner],
    ["facilitator/sponsor", context.facilitatorSigner]
  ];

  return Promise.all(
    rows.map(async ([label, signer]) => {
      const [usdcAta] = await findAssociatedTokenPda({
        mint: context.mint,
        owner: signer.address,
        tokenProgram: context.tokenProgram
      });
      const lamports = await rpc.getBalance(signer.address).send();
      let usdc = "no token account";

      try {
        const tokenBalance = await rpc.getTokenAccountBalance(usdcAta).send();
        usdc = `${tokenBalance.value.uiAmountString} USDC (${tokenBalance.value.amount} atomic)`;
      } catch {
        usdc = "no token account";
      }

      return {
        label,
        address: signer.address,
        sol: `${Number(lamports.value) / 1_000_000_000} SOL`,
        usdcAta,
        usdc
      };
    })
  );
}

export const SUBSCRIPTIONS_PROGRAM_FOR_SAFE = SUBSCRIPTIONS_PROGRAM_ADDRESS;
