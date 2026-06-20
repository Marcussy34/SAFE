import { afterAll, describe, expect, it } from "vitest";
import { createReplayStore } from "@/lib/policy/replayStore";
import { RedisReplayStore, createIoredisReplayClient } from "@/lib/policy/redisReplayStore";

const REDIS_URL = process.env.SAFE_TEST_REDIS_URL ?? "redis://127.0.0.1:6379";
const FP = "stats-api.demo:20000:match";

// Probe a real Redis once; skip the whole suite if none is reachable so CI
// without Redis stays green. Locally (redis-server running) it runs for real.
async function canConnect(url: string): Promise<boolean> {
  try {
    const { client, close } = await createIoredisReplayClient(url);
    await client.exists("safe:replay:__probe__");
    await close();
    return true;
  } catch {
    return false;
  }
}

const redisReachable = await canConnect(REDIS_URL);

// Unique prefix per test keeps the shared Redis isolated without flushing it.
let counter = 0;
function uniquePrefix(): string {
  counter += 1;
  return `safe:test:${Date.now()}:${counter}`;
}

const openClients: Array<{ close(): Promise<void> }> = [];
async function newStore(keyPrefix: string): Promise<RedisReplayStore> {
  const conn = await createIoredisReplayClient(REDIS_URL);
  openClients.push(conn);
  return new RedisReplayStore({ client: conn.client, keyPrefix });
}

afterAll(async () => {
  await Promise.all(openClients.map((c) => c.close()));
});

describe.skipIf(!redisReachable)("RedisReplayStore (integration)", () => {
  it("remembers a request so the repeat is a duplicate", async () => {
    const store = await newStore(uniquePrefix());

    const first = await store.checkAndRemember(FP, "hash-a", 300);
    const second = await store.checkAndRemember(FP, "hash-a", 300);

    expect(first.duplicate).toBe(false);
    expect(first.duplicateFingerprint).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.duplicateFingerprint).toBe(true);
  });

  it("flags a duplicate fingerprint with a different request hash", async () => {
    const store = await newStore(uniquePrefix());

    await store.checkAndRemember(FP, "hash-a", 300);
    const changed = await store.checkAndRemember(FP, "hash-b", 300);

    expect(changed.duplicate).toBe(false);
    expect(changed.duplicateFingerprint).toBe(true);
  });

  it("keeps check() advisory so it never remembers", async () => {
    const store = await newStore(uniquePrefix());

    const advisory = await store.check(FP, "hash-a");
    const payment = await store.checkAndRemember(FP, "hash-a", 300);

    expect(advisory.duplicate).toBe(false);
    expect(payment.duplicate).toBe(false);
  });

  it("forget() releases a remembered request so a retry is allowed", async () => {
    const store = await newStore(uniquePrefix());

    await store.checkAndRemember(FP, "hash-a", 300);
    await store.forget(FP, "hash-a");
    const retry = await store.checkAndRemember(FP, "hash-a", 300);

    expect(retry.duplicate).toBe(false);
  });

  it("allows the same request again after the window expires", async () => {
    const store = await newStore(uniquePrefix());

    await store.checkAndRemember(FP, "hash-a", 1);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    const afterExpiry = await store.checkAndRemember(FP, "hash-a", 1);

    expect(afterExpiry.duplicate).toBe(false);
  });

  it("lets exactly one of many concurrent instances win the same request", async () => {
    const prefix = uniquePrefix();
    // Separate connections simulate separate SAFE instances racing the same payment.
    const stores = await Promise.all([newStore(prefix), newStore(prefix), newStore(prefix), newStore(prefix), newStore(prefix)]);

    const results = await Promise.all(stores.map((store) => store.checkAndRemember(FP, "hash-race", 300)));

    const winners = results.filter((r) => !r.duplicate);
    expect(winners).toHaveLength(1);
  });
});

describe("createReplayStore Redis selection", () => {
  it("returns a RedisReplayStore when SAFE_REDIS_URL is set", () => {
    const store = createReplayStore({ SAFE_REDIS_URL: REDIS_URL });
    expect(store).toBeInstanceOf(RedisReplayStore);
  });
});
