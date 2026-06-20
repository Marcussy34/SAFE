export const DEFAULT_SOLANA_RPC_URL = "https://api.devnet.solana.com";
export const DEFAULT_SOLANA_WS_URL = "wss://api.devnet.solana.com/";

export type SolanaEnv = Record<string, string | undefined>;

export function deriveDemoAtaLabel(owner: string, mint: string): string {
  return `${owner}:ata:${mint}`;
}

export function getSolanaRpcUrl(env: SolanaEnv = process.env): string {
  return env.SOLANA_RPC_URL?.trim() || DEFAULT_SOLANA_RPC_URL;
}

export function getSolanaRpcSubscriptionsUrl(env: SolanaEnv = process.env): string {
  const configuredWsUrl = env.SOLANA_RPC_WS_URL?.trim();

  if (configuredWsUrl) {
    return configuredWsUrl;
  }

  try {
    const url = new URL(getSolanaRpcUrl(env));
    url.protocol = url.protocol === "http:" ? "ws:" : "wss:";
    return url.toString();
  } catch {
    return DEFAULT_SOLANA_WS_URL;
  }
}

export function isLiveSolanaMode(env: SolanaEnv = process.env): boolean {
  return env.SAFE_DEMO_MODE === "false";
}

export function requireEnv(name: string, env: SolanaEnv = process.env): string {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function redactRpcUrl(rpcUrl: string): string {
  try {
    const url = new URL(rpcUrl);
    const hasSensitiveSuffix = url.pathname !== "/" || url.search !== "" || url.username !== "" || url.password !== "";
    return hasSensitiveSuffix ? `${url.origin}/...` : url.origin;
  } catch {
    return "[invalid-rpc-url]";
  }
}

export function solanaExplorerTxUrl(signature: string, cluster = "devnet"): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
}
