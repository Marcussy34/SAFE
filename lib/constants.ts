export const SOLANA_DEVNET_CHAIN_ID = "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";
export const DEMO_TOKEN_DECIMALS = 6;
export const DEMO_EXPIRES_AT = "2099-12-31T23:59:00Z";
export const DEMO_MINT_PLACEHOLDER = "6cTTbwaVL9CEZ9W1y96DXKzEjmAYs9tqqkKk2e92hSs1";
export const FACILITATOR_PAY_TO_PLACEHOLDER = "HMQhX69n4xqaP7SRMB94EWGAVVVPz8uhVJhYqA8WZxBg";
export const SAFE_SESSION_SIGNER_PLACEHOLDER = "AHbgsgxvHh66fYHVrogdJjEUcaM4RDTvHBN29BeYYsUE";
export const DEMO_FIXED_DELEGATION_PDA = "7sTV6yU7rLm32SHLXV7QNJVdsWXPmZKXzto4NFfDtUAN";
export const DEMO_SUBSCRIPTION_AUTHORITY_PDA = "wSfPhRka4vxQgmCPjchP99eXwhN49exd8781cK6hyHX";
export const DEMO_DELEGATOR_ATA = "4XXZ8yj8yVGmtu6SM83iYiH24DzTaV1n4DtshdUZzY4K";
export const DEMO_FACILITATOR_URL = "https://safe.local/facilitator";

export function usdcToAtomicUnits(amountUsdc: number): string {
  if (!Number.isFinite(amountUsdc) || amountUsdc < 0) {
    throw new Error("USDC amount must be a finite, non-negative number.");
  }
  return Math.round(amountUsdc * 10 ** DEMO_TOKEN_DECIMALS).toString();
}
