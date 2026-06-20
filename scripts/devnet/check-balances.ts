import { loadLocalEnv } from "./load-local-env";
import { getDevnetBalances } from "../../lib/solana/liveSettlement";
import { getSolanaRpcUrl, redactRpcUrl } from "../../lib/solana/addresses";

async function main(): Promise<void> {
  loadLocalEnv();

  console.log("SAFE devnet balances");
  console.log(`RPC URL: ${redactRpcUrl(getSolanaRpcUrl())}`);

  const balances = await getDevnetBalances();

  for (const balance of balances) {
    console.log(`- ${balance.label}`);
    console.log(`  address: ${balance.address}`);
    console.log(`  SOL: ${balance.sol}`);
    console.log(`  USDC ATA: ${balance.usdcAta}`);
    console.log(`  USDC: ${balance.usdc}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
