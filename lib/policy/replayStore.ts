import { ReplayGuard, type ReplayCheckResult } from "@/lib/policy/replayGuard";
import { RedisReplayStore } from "@/lib/policy/redisReplayStore";

// Async port over the replay guard so the policy path can run against either an
// in-memory guard (single process) or a shared store (multi-instance, e.g. Redis).
export interface ReplayStore {
  // Advisory read; needs no window (entry lifetimes are set when remembered).
  check(fingerprint: string, requestHash: string): Promise<ReplayCheckResult>;
  checkAndRemember(fingerprint: string, requestHash: string, windowSeconds: number): Promise<ReplayCheckResult>;
  forget(fingerprint: string, requestHash: string): Promise<void>;
}

// Wraps the existing synchronous ReplayGuard. When constructed with a shared
// guard instance, sync and async callers see the same state (no split-brain).
export class InMemoryReplayStore implements ReplayStore {
  constructor(private readonly guard: ReplayGuard = new ReplayGuard()) {}

  check(fingerprint: string, requestHash: string): Promise<ReplayCheckResult> {
    return Promise.resolve(this.guard.check(fingerprint, requestHash, 0));
  }

  checkAndRemember(fingerprint: string, requestHash: string, windowSeconds: number): Promise<ReplayCheckResult> {
    return Promise.resolve(this.guard.checkAndRemember(fingerprint, requestHash, windowSeconds));
  }

  forget(fingerprint: string, requestHash: string): Promise<void> {
    this.guard.forget(fingerprint, requestHash);
    return Promise.resolve();
  }
}

export interface ReplayStoreEnv {
  SAFE_REDIS_URL?: string;
  SAFE_REPLAY_KEY_PREFIX?: string;
}

// Picks the backend by environment: shared Redis when SAFE_REDIS_URL is set
// (multi-instance safe), otherwise fully in-memory for the demo/dev path.
export function createReplayStore(env: ReplayStoreEnv = {}): ReplayStore {
  const url = env.SAFE_REDIS_URL?.trim();
  if (url) {
    return new RedisReplayStore({ url, keyPrefix: env.SAFE_REPLAY_KEY_PREFIX?.trim() });
  }

  return new InMemoryReplayStore();
}
