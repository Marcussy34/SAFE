import { memoryStore } from "@/lib/store/memoryStore";

export async function GET() {
  return Response.json({ intent: memoryStore.intent });
}

export async function POST() {
  return Response.json({ intent: memoryStore.intent });
}
