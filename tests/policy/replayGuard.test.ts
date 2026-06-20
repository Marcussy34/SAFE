import { describe, expect, it } from "vitest";
import { ReplayGuard } from "@/lib/policy/replayGuard";

describe("ReplayGuard", () => {
  it("blocks duplicate fingerprints and request hashes within the configured window", () => {
    const guard = new ReplayGuard();

    const first = guard.checkAndRemember("stats-api.demo:20000:match", "hash-a", 300, 1000);
    const second = guard.checkAndRemember("stats-api.demo:20000:match", "hash-a", 300, 1100);

    expect(first.duplicate).toBe(false);
    expect(first.duplicateFingerprint).toBe(false);
    expect(second.duplicate).toBe(true);
    expect(second.duplicateFingerprint).toBe(true);
  });

  it("allows the same fingerprint after expiry", () => {
    const guard = new ReplayGuard();

    guard.checkAndRemember("stats-api.demo:20000:match", "hash-a", 3, 1000);
    const later = guard.checkAndRemember("stats-api.demo:20000:match", "hash-a", 3, 5000);

    expect(later.duplicate).toBe(false);
    expect(later.duplicateFingerprint).toBe(false);
  });

  it("allows the same fingerprint with a different request hash", () => {
    const guard = new ReplayGuard();

    guard.checkAndRemember("stats-api.demo:20000:match", "hash-a", 300, 1000);
    const changed = guard.checkAndRemember("stats-api.demo:20000:match", "hash-b", 300, 1100);

    expect(changed.duplicate).toBe(false);
    expect(changed.duplicateFingerprint).toBe(true);
  });

  it("keeps older hashes for the same fingerprint until they expire", () => {
    const guard = new ReplayGuard();

    guard.checkAndRemember("stats-api.demo:20000:match", "hash-a", 300, 1000);
    guard.checkAndRemember("stats-api.demo:20000:match", "hash-b", 300, 1100);
    const repeatedOriginal = guard.checkAndRemember("stats-api.demo:20000:match", "hash-a", 300, 1200);

    expect(repeatedOriginal.duplicate).toBe(true);
  });
});
