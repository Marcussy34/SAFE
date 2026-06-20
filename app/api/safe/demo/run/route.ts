import { runSafeDemo } from "@/lib/demo/demoRunner";
import type { SafeDemoRunInput } from "@/lib/demo/demoRunner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function readBody(request: Request): Promise<SafeDemoRunInput> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {};
  }

  if (!isRecord(body)) {
    return {};
  }

  return {
    prompt: typeof body.prompt === "string" ? body.prompt : undefined,
    dryRun: body.dryRun === true,
    requireLive: typeof body.requireLive === "boolean" ? body.requireLive : undefined
  };
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const baseUrl = new URL(request.url).origin;

  try {
    return Response.json(await runSafeDemo({ ...body, baseUrl }));
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "SAFE demo run failed." },
      { status: 400 }
    );
  }
}
