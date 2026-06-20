import { describe, expect, it } from "vitest";
import { DEMO_POLICY } from "@/lib/fixtures/demoPolicy";
import { getAllowanceState } from "@/lib/solana/allowanceAdapter";
import {
  DEFAULT_SOLANA_RPC_URL,
  DEFAULT_SOLANA_WS_URL,
  deriveDemoAtaLabel,
  getSolanaRpcSubscriptionsUrl,
  isLiveSolanaMode,
  redactRpcUrl,
  solanaExplorerTxUrl
} from "@/lib/solana/addresses";

describe("solana address helpers", () => {
  it("creates deterministic demo ATA labels for mock verification", () => {
    expect(deriveDemoAtaLabel("owner", "mint")).toBe("owner:ata:mint");
    expect(deriveDemoAtaLabel("wallet-1", "token-2")).toBe("wallet-1:ata:token-2");
  });

  it("defaults to demo mode unless SAFE_DEMO_MODE is exactly false", () => {
    expect(isLiveSolanaMode({ SAFE_DEMO_MODE: "true" })).toBe(false);
    expect(isLiveSolanaMode({ SAFE_DEMO_MODE: "FALSE" })).toBe(false);
    expect(isLiveSolanaMode({ SAFE_DEMO_MODE: "false" })).toBe(true);
    expect(isLiveSolanaMode({})).toBe(false);
  });

  it("builds Solana explorer transaction URLs for the selected cluster", () => {
    expect(solanaExplorerTxUrl("demoSignature")).toBe("https://explorer.solana.com/tx/demoSignature?cluster=devnet");
    expect(solanaExplorerTxUrl("demoSignature", "testnet")).toBe(
      "https://explorer.solana.com/tx/demoSignature?cluster=testnet"
    );
  });

  it("redacts RPC URL paths, query strings, and credentials before logging", () => {
    expect(redactRpcUrl("https://api.devnet.solana.com")).toBe("https://api.devnet.solana.com");
    expect(redactRpcUrl("https://rpc.example.com/path?api-key=secret")).toBe("https://rpc.example.com/...");
    expect(redactRpcUrl("https://user:pass@rpc.example.com")).toBe("https://rpc.example.com/...");
    expect(redactRpcUrl("not a url")).toBe("[invalid-rpc-url]");
  });

  it("derives websocket RPC URLs unless explicitly configured", () => {
    expect(getSolanaRpcSubscriptionsUrl({})).toBe(DEFAULT_SOLANA_WS_URL);
    expect(getSolanaRpcSubscriptionsUrl({ SOLANA_RPC_URL: "https://api.devnet.solana.com" })).toBe(
      "wss://api.devnet.solana.com/"
    );
    expect(getSolanaRpcSubscriptionsUrl({ SOLANA_RPC_WS_URL: "wss://rpc.example.com/ws" })).toBe(
      "wss://rpc.example.com/ws"
    );
  });
});

describe("allowance adapter", () => {
  it("returns the demo allowance and default RPC URL in demo mode", async () => {
    const state = await getAllowanceState({ SAFE_DEMO_MODE: "true" });

    expect(state.allowance).toBe(DEMO_POLICY.allowance);
    expect(state.liveMode).toBe(false);
    expect(state.rpcUrl).toBe(DEFAULT_SOLANA_RPC_URL);
    expect(state.explorerUrl).toBeUndefined();
  });

  it("uses live mode, RPC URL, and explorer signature from the environment", async () => {
    const state = await getAllowanceState({
      NEXT_PUBLIC_SOLANA_CLUSTER: "devnet",
      SAFE_DEMO_ALLOWANCE_SIGNATURE: "demoSignature",
      SAFE_DEMO_MODE: "false",
      SOLANA_RPC_URL: "https://rpc.devnet.example"
    });

    expect(state.liveMode).toBe(true);
    expect(state.rpcUrl).toBe("https://rpc.devnet.example");
    expect(state.explorerUrl).toBe("https://explorer.solana.com/tx/demoSignature?cluster=devnet");
  });
});
