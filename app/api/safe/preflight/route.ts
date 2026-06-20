import { safePreflight } from "@/lib/safe/safePaymentService";
import type { SafePreflightInput } from "@/lib/safe/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function badRequest(error: string) {
  return Response.json({ error }, { status: 400 });
}

async function readBody(request: Request): Promise<SafePreflightInput | null> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (!isRecord(body) || !isRecord(body.requirement)) {
    return null;
  }

  return {
    requirement: body.requirement as SafePreflightInput["requirement"],
    agentReason: typeof body.agentReason === "string" ? body.agentReason : undefined
  };
}

export async function POST(request: Request) {
  const body = await readBody(request);

  if (!body) {
    return badRequest("Body must include a payment requirement.");
  }

  try {
    return Response.json(await safePreflight(body));
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Invalid SAFE preflight request.");
  }
}
