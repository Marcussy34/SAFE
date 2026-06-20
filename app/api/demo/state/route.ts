import { getSafeDemoState } from "@/lib/runtime/demoState";

export const runtime = "nodejs";

export async function GET() {
  return Response.json(await getSafeDemoState());
}
