import { memoryStore } from "@/lib/store/memoryStore";

export const runtime = "nodejs";

export async function GET() {
  return Response.json({ records: memoryStore.listAudit() });
}
