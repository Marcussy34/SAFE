import {
  address,
  appendTransactionMessageInstructions,
  compileTransaction,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  getBase64EncodedWireTransaction,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  type Address,
  type Instruction,
  type Rpc,
  type SolanaRpcApi,
  type TransactionSigner
} from "@solana/kit";
import {
  findAssociatedTokenPda,
  getCreateAssociatedTokenIdempotentInstruction,
  TOKEN_PROGRAM_ADDRESS
} from "@solana-program/token";
import {
  fetchMaybeFixedDelegation,
  fetchMaybeSubscriptionAuthority,
  findFixedDelegationPda,
  findSubscriptionAuthorityPda,
  getCreateFixedDelegationInstruction,
  getInitSubscriptionAuthorityInstruction
} from "@solana/subscriptions";
import { DEMO_MINT_PLACEHOLDER } from "@/lib/constants";
import {
  DEFAULT_ALLOWANCE_AMOUNT_ATOMIC_UNITS,
  DEFAULT_DELEGATION_NONCE,
  signerFromBase58Env
} from "@/lib/solana/liveSettlement";
import { getSolanaRpcUrl, type SolanaEnv } from "@/lib/solana/addresses";

export type WalletAllowanceAction = "initSubscriptionAuthority" | "createFixedDelegation";

export interface WalletAllowanceStatus {
  owner: string;
  delegatee: string;
  mint: string;
  tokenProgram: string;
  userAta: string;
  subscriptionAuthorityPda: string;
  fixedDelegationPda: string;
  subscriptionAuthorityExists: boolean;
  fixedDelegationExists: boolean;
  fixedDelegationAmountAtomicUnits?: string;
  fixedDelegationExpiryTs?: string;
  userSol: string;
  userUsdc: string;
  nonce: string;
  allowanceAmountAtomicUnits: string;
  allowanceExpiryTs: string;
}

export interface WalletAllowanceTransaction {
  action: WalletAllowanceAction;
  transactionBase64: string;
  owner: string;
  delegatee: string;
  mint: string;
  userAta: string;
  subscriptionAuthorityPda: string;
  fixedDelegationPda: string;
  nonce: string;
  amountAtomicUnits: string;
  expiryTs: string;
}

export interface WalletAllowanceBuildOptions {
  ownerAddress: string;
  amountAtomicUnits?: string;
  expiryTs?: string;
  nonce?: string;
}

interface WalletAllowanceContext {
  owner: Address;
  ownerSigner: TransactionSigner;
  delegatee: Address;
  mint: Address;
  tokenProgram: Address;
  userAta: Address;
  subscriptionAuthorityPda: Address;
  fixedDelegationPda: Address;
  nonce: bigint;
  amountAtomicUnits: bigint;
  expiryTs: bigint;
}

function amountFromOptions(options: WalletAllowanceBuildOptions, env: SolanaEnv): bigint {
  return BigInt(options.amountAtomicUnits?.trim() || env.SAFE_ALLOWANCE_AMOUNT_ATOMIC_UNITS || DEFAULT_ALLOWANCE_AMOUNT_ATOMIC_UNITS);
}

function expiryFromOptions(options: WalletAllowanceBuildOptions, env: SolanaEnv): bigint {
  const configured = options.expiryTs?.trim() || env.SAFE_ALLOWANCE_EXPIRY_TS?.trim();

  if (configured) {
    return BigInt(configured);
  }

  return BigInt(Math.floor(Date.now() / 1000) + 24 * 60 * 60);
}

function nonceFromOptions(options: WalletAllowanceBuildOptions, env: SolanaEnv): bigint {
  return BigInt(options.nonce?.trim() || env.SAFE_DELEGATION_NONCE || DEFAULT_DELEGATION_NONCE);
}

function assertFutureExpiry(expiryTs: bigint): void {
  if (expiryTs <= BigInt(Math.floor(Date.now() / 1000))) {
    throw new Error("Allowance expiry must be a future Unix timestamp in seconds.");
  }
}

function assertPositiveAmount(amount: bigint): void {
  if (amount <= 0n) {
    throw new Error("Allowance amount must be a positive integer in token atomic units.");
  }
}

function createRpc(env: SolanaEnv): Rpc<SolanaRpcApi> {
  return createSolanaRpc(getSolanaRpcUrl(env));
}

async function getDelegateeAddress(env: SolanaEnv): Promise<Address> {
  const configuredAddress = env.SAFE_DELEGATEE_ADDRESS?.trim();

  if (configuredAddress) {
    return address(configuredAddress);
  }

  const delegateeSigner = await signerFromBase58Env("SAFE_SESSION_SECRET_BASE58", env);
  return delegateeSigner.address;
}

async function getWalletAllowanceContext(
  options: WalletAllowanceBuildOptions,
  env: SolanaEnv
): Promise<WalletAllowanceContext> {
  const owner = address(options.ownerAddress.trim());
  const ownerSigner = createNoopSigner(owner);
  const delegatee = await getDelegateeAddress(env);
  const mint = address(env.SAFE_DEMO_MINT?.trim() || DEMO_MINT_PLACEHOLDER);
  const tokenProgram = TOKEN_PROGRAM_ADDRESS;
  const nonce = nonceFromOptions(options, env);
  const amountAtomicUnits = amountFromOptions(options, env);
  const expiryTs = expiryFromOptions(options, env);

  assertPositiveAmount(amountAtomicUnits);
  assertFutureExpiry(expiryTs);

  const [subscriptionAuthorityPda] = await findSubscriptionAuthorityPda({ tokenMint: mint, user: owner });
  const [fixedDelegationPda] = await findFixedDelegationPda({
    delegatee,
    delegator: owner,
    nonce,
    subscriptionAuthority: subscriptionAuthorityPda
  });
  const [userAta] = await findAssociatedTokenPda({ mint, owner, tokenProgram });

  return {
    owner,
    ownerSigner,
    delegatee,
    mint,
    tokenProgram,
    userAta,
    subscriptionAuthorityPda,
    fixedDelegationPda,
    nonce,
    amountAtomicUnits,
    expiryTs
  };
}

async function compileWalletSignedTransaction(
  instructions: Instruction[],
  feePayer: TransactionSigner,
  env: SolanaEnv
): Promise<string> {
  const rpc = createRpc(env);
  const latestBlockhash = await rpc.getLatestBlockhash({ commitment: "confirmed" }).send();
  const message = appendTransactionMessageInstructions(
    instructions,
    setTransactionMessageLifetimeUsingBlockhash(
      latestBlockhash.value,
      setTransactionMessageFeePayerSigner(feePayer, createTransactionMessage({ version: 0 }))
    )
  );
  const transaction = compileTransaction(message);

  // The wallet supplies the real user signature in the browser.
  return getBase64EncodedWireTransaction(transaction);
}

function baseTransactionResponse(context: WalletAllowanceContext, action: WalletAllowanceAction, transactionBase64: string) {
  return {
    action,
    transactionBase64,
    owner: context.owner,
    delegatee: context.delegatee,
    mint: context.mint,
    userAta: context.userAta,
    subscriptionAuthorityPda: context.subscriptionAuthorityPda,
    fixedDelegationPda: context.fixedDelegationPda,
    nonce: context.nonce.toString(),
    amountAtomicUnits: context.amountAtomicUnits.toString(),
    expiryTs: context.expiryTs.toString()
  };
}

export async function getWalletAllowanceStatus(
  ownerAddress: string,
  env: SolanaEnv = process.env
): Promise<WalletAllowanceStatus> {
  const context = await getWalletAllowanceContext({ ownerAddress }, env);
  const rpc = createRpc(env);
  const [subscriptionAuthority, fixedDelegation, userSol] = await Promise.all([
    fetchMaybeSubscriptionAuthority(rpc, context.subscriptionAuthorityPda),
    fetchMaybeFixedDelegation(rpc, context.fixedDelegationPda),
    rpc.getBalance(context.owner).send()
  ]);
  let userUsdc = "no token account";

  try {
    const tokenBalance = await rpc.getTokenAccountBalance(context.userAta).send();
    userUsdc = `${tokenBalance.value.uiAmountString} USDC (${tokenBalance.value.amount} atomic)`;
  } catch {
    userUsdc = "no token account";
  }

  return {
    owner: context.owner,
    delegatee: context.delegatee,
    mint: context.mint,
    tokenProgram: context.tokenProgram,
    userAta: context.userAta,
    subscriptionAuthorityPda: context.subscriptionAuthorityPda,
    fixedDelegationPda: context.fixedDelegationPda,
    subscriptionAuthorityExists: subscriptionAuthority.exists,
    fixedDelegationExists: fixedDelegation.exists,
    fixedDelegationAmountAtomicUnits: fixedDelegation.exists ? fixedDelegation.data.amount.toString() : undefined,
    fixedDelegationExpiryTs: fixedDelegation.exists ? fixedDelegation.data.expiryTs.toString() : undefined,
    userSol: `${Number(userSol.value) / 1_000_000_000} SOL`,
    userUsdc,
    nonce: context.nonce.toString(),
    allowanceAmountAtomicUnits: context.amountAtomicUnits.toString(),
    allowanceExpiryTs: context.expiryTs.toString()
  };
}

export async function buildInitSubscriptionAuthorityTransaction(
  options: WalletAllowanceBuildOptions,
  env: SolanaEnv = process.env
): Promise<WalletAllowanceTransaction> {
  const context = await getWalletAllowanceContext(options, env);
  const rpc = createRpc(env);
  const subscriptionAuthority = await fetchMaybeSubscriptionAuthority(rpc, context.subscriptionAuthorityPda);

  if (subscriptionAuthority.exists) {
    throw new Error("Subscription authority already exists. No wallet transaction is needed.");
  }

  const createUserAtaInstruction = getCreateAssociatedTokenIdempotentInstruction({
    payer: context.ownerSigner,
    ata: context.userAta,
    owner: context.owner,
    mint: context.mint,
    tokenProgram: context.tokenProgram
  });
  const initInstruction = getInitSubscriptionAuthorityInstruction({
    owner: context.ownerSigner,
    subscriptionAuthority: context.subscriptionAuthorityPda,
    tokenMint: context.mint,
    tokenProgram: context.tokenProgram,
    userAta: context.userAta
  });
  const transactionBase64 = await compileWalletSignedTransaction(
    [createUserAtaInstruction, initInstruction],
    context.ownerSigner,
    env
  );

  return baseTransactionResponse(context, "initSubscriptionAuthority", transactionBase64);
}

export async function buildCreateFixedDelegationTransaction(
  options: WalletAllowanceBuildOptions,
  env: SolanaEnv = process.env
): Promise<WalletAllowanceTransaction> {
  const context = await getWalletAllowanceContext(options, env);
  const rpc = createRpc(env);
  const subscriptionAuthority = await fetchMaybeSubscriptionAuthority(rpc, context.subscriptionAuthorityPda);

  if (!subscriptionAuthority.exists) {
    throw new Error("Initialize the subscription authority before creating the fixed delegation.");
  }

  const fixedDelegation = await fetchMaybeFixedDelegation(rpc, context.fixedDelegationPda);

  if (fixedDelegation.exists) {
    throw new Error("Fixed allowance already exists. No wallet transaction is needed.");
  }

  const createInstruction = getCreateFixedDelegationInstruction({
    delegatee: context.delegatee,
    delegationAccount: context.fixedDelegationPda,
    delegator: context.ownerSigner,
    fixedDelegation: {
      amount: context.amountAtomicUnits,
      expiryTs: context.expiryTs,
      expectedSubscriptionAuthorityInitId: subscriptionAuthority.data.initId,
      nonce: context.nonce
    },
    subscriptionAuthority: context.subscriptionAuthorityPda
  });
  const transactionBase64 = await compileWalletSignedTransaction([createInstruction], context.ownerSigner, env);

  return baseTransactionResponse(context, "createFixedDelegation", transactionBase64);
}
