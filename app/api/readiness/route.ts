import { getSafeReadiness } from "@/lib/runtime/readiness";

export async function GET() {
  return Response.json({ readiness: await getSafeReadiness() });
}
