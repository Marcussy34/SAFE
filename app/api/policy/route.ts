import { isLiveSolanaMode } from "@/lib/solana/addresses";
import { hasLiveSignerEnv, livePolicyFromContext } from "@/lib/solana/liveSettlement";
import { memoryStore } from "@/lib/store/memoryStore";

async function currentPolicy() {
  if (isLiveSolanaMode() && hasLiveSignerEnv()) {
    return livePolicyFromContext(memoryStore.policy);
  }

  return memoryStore.policy;
}

export async function GET() {
  return Response.json({ policy: await currentPolicy() });
}

export async function POST() {
  return Response.json({ policy: await currentPolicy() });
}
