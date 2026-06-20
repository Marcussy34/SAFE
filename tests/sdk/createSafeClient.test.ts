import { describe, expect, it } from "vitest";

import { createSafeClient } from "@/lib/sdk/createSafeClient";

describe("createSafeClient demo methods", () => {
  it("posts demo run requests to the SAFE demo runner route", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const safe = createSafeClient({
      baseUrl: "http://safe.local",
      fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), init });
        return Response.json({ runId: "run_1", summary: { dryRun: false } });
      }) as typeof fetch
    });

    const result = await safe.demoRun({
      prompt: "Spend up to $5 on match data.",
      dryRun: false,
      requireLive: true
    });

    expect(result).toEqual({ runId: "run_1", summary: { dryRun: false } });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("http://safe.local/api/safe/demo/run");
    expect(calls[0].init?.method).toBe("POST");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      prompt: "Spend up to $5 on match data.",
      dryRun: false,
      requireLive: true
    });
  });

  it("reads dashboard-visible demo transcript state", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    const safe = createSafeClient({
      baseUrl: "http://safe.local",
      fetchImpl: (async (input: RequestInfo | URL, init?: RequestInit) => {
        calls.push({ url: String(input), init });
        return Response.json({ runs: [{ runId: "run_1" }] });
      }) as typeof fetch
    });

    const result = await safe.demoState();

    expect(result).toEqual({ runs: [{ runId: "run_1" }] });
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe("http://safe.local/api/safe/demo/state");
    expect(calls[0].init?.method).toBeUndefined();
  });
});
