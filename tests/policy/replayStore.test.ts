import { describe, expect, it } from "vitest";
import { ReplayGuard } from "@/lib/policy/replayGuard";
import { InMemoryReplayStore, createReplayStore } from "@/lib/policy/replayStore";

const FP = "stats-api.demo:20000:match";

describe("InMemoryReplayStore", () => {
  it("remembers a request so the repeat is a duplicate", async () => {
    const store = new InMemoryReplayStore();

    const first = await store.checkAndRemember(FP, "hash-a", 300);
    const second = await store.checkAndRemember(FP, "hash-a", 300);

    expect(first.duplicate).toBe(false);
    expect(first.duplicateFingerprint).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.duplicateFingerprint).toBe(true);
  });

  it("flags a duplicate fingerprint with a different request hash", async () => {
    const store = new InMemoryReplayStore();

    await store.checkAndRemember(FP, "hash-a", 300);
    const changed = await store.checkAndRemember(FP, "hash-b", 300);

    expect(changed.duplicate).toBe(false);
    expect(changed.duplicateFingerprint).toBe(true);
  });

  it("keeps check() advisory so it never remembers", async () => {
    const store = new InMemoryReplayStore();

    const advisory = await store.check(FP, "hash-a");
    const payment = await store.checkAndRemember(FP, "hash-a", 300);

    expect(advisory.duplicate).toBe(false);
    expect(payment.duplicate).toBe(false);
  });

  it("forget() releases a remembered request so a retry is allowed", async () => {
    const store = new InMemoryReplayStore();

    await store.checkAndRemember(FP, "hash-a", 300);
    await store.forget(FP, "hash-a");
    const retry = await store.checkAndRemember(FP, "hash-a", 300);

    expect(retry.duplicate).toBe(false);
  });

  it("shares state with the ReplayGuard it wraps (no split-brain)", async () => {
    const guard = new ReplayGuard();
    const store = new InMemoryReplayStore(guard);

    await store.checkAndRemember(FP, "hash-a", 300);
    const seenByGuard = guard.check(FP, "hash-a", 300);

    expect(seenByGuard.duplicate).toBe(true);
  });
});

describe("createReplayStore", () => {
  it("returns an in-memory store when SAFE_REDIS_URL is not set", () => {
    const store = createReplayStore({});
    expect(store).toBeInstanceOf(InMemoryReplayStore);
  });
});
