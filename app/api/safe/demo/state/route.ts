import { memoryStore } from "@/lib/store/memoryStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({ runs: memoryStore.listDemoRuns() });
}
