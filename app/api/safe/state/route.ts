import { getSafeDemoState } from "@/lib/runtime/demoState";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(await getSafeDemoState());
}
