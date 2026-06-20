import { safePay } from "@/lib/safe/safePaymentService";
import type { SafePayInput } from "@/lib/safe/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function badRequest(error: string) {
  return Response.json({ error }, { status: 400 });
}

async function readBody(request: Request): Promise<SafePayInput | null> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return null;
  }

  if (!isRecord(body)) {
    return null;
  }

  const resourceUrl = typeof body.resourceUrl === "string" ? body.resourceUrl.trim() : undefined;
  const requirement = isRecord(body.requirement) ? (body.requirement as SafePayInput["requirement"]) : undefined;

  if (!resourceUrl && !requirement) {
    return null;
  }

  return {
    resourceUrl,
    requirement,
    agentReason: typeof body.agentReason === "string" ? body.agentReason : undefined,
    dryRun: body.dryRun === true
  };
}

export async function POST(request: Request) {
  const body = await readBody(request);

  if (!body) {
    return badRequest("Body must include resourceUrl or requirement.");
  }

  try {
    return Response.json(await safePay(body));
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Invalid SAFE payment request.");
  }
}
