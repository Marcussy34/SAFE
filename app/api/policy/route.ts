import { memoryStore } from "@/lib/store/memoryStore";

export async function GET() {
  return Response.json({ policy: memoryStore.policy });
}

export async function POST() {
  return Response.json({ policy: memoryStore.policy });
}
