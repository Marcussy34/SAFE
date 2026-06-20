import type { ReplayCheckResult } from "@/lib/policy/replayGuard";
import type { ReplayStore } from "@/lib/policy/replayStore";

// Minimal Redis surface the store needs. Keeps ioredis out of the type graph and
// makes the store trivially testable with any conforming client.
export interface ReplayRedisClient {
  setNxPx(key: string, value: string, ttlMs: number): Promise<boolean>; // SET key val PX ttl NX -> true if newly set
  setPx(key: string, value: string, ttlMs: number): Promise<void>; // SET key val PX ttl (refresh)
  exists(key: string): Promise<boolean>;
  del(key: string): Promise<void>;
}

export interface RedisReplayStoreOptions {
  client?: ReplayRedisClient; // inject a client (tests / advanced) ...
  url?: string; // ... or lazily connect to this URL (production)
  keyPrefix?: string;
}

// Shared replay state across SAFE instances. The hard guarantee (no duplicate
// settlement) rests on a single atomic `SET NX` per request hash, which Redis
// serializes regardless of how many instances race the same payment.
export class RedisReplayStore implements ReplayStore {
  private readonly keyPrefix: string;
  private readonly providedClient?: ReplayRedisClient;
  private readonly url?: string;
  private lazyClient: Promise<ReplayRedisClient> | null = null;
  private closer: (() => Promise<void>) | null = null;

  constructor(options: RedisReplayStoreOptions) {
    this.providedClient = options.client;
    this.url = options.url;
    this.keyPrefix = options.keyPrefix ?? "safe:replay";

    if (!this.providedClient && !this.url) {
      throw new Error("RedisReplayStore requires either a client or a url.");
    }
  }

  private hashKey(fingerprint: string, requestHash: string): string {
    return `${this.keyPrefix}:h:${fingerprint}:${requestHash}`;
  }

  private fpKey(fingerprint: string): string {
    return `${this.keyPrefix}:f:${fingerprint}`;
  }

  private getClient(): Promise<ReplayRedisClient> {
    if (this.providedClient) {
      return Promise.resolve(this.providedClient);
    }

    return (this.lazyClient ??= createIoredisReplayClient(this.url as string).then(({ client, close }) => {
      this.closer = close;
      return client;
    }));
  }

  async check(fingerprint: string, requestHash: string): Promise<ReplayCheckResult> {
    const client = await this.getClient();
    const [hashSeen, fpSeen] = await Promise.all([
      client.exists(this.hashKey(fingerprint, requestHash)),
      client.exists(this.fpKey(fingerprint))
    ]);

    return { duplicate: hashSeen, duplicateFingerprint: fpSeen, fingerprint, requestHash };
  }

  async checkAndRemember(fingerprint: string, requestHash: string, windowSeconds: number): Promise<ReplayCheckResult> {
    const client = await this.getClient();
    const ttlMs = Math.max(1, Math.floor(windowSeconds * 1000));

    // Authoritative, race-free dedup: one atomic SET NX claims the exact request.
    const claimed = await client.setNxPx(this.hashKey(fingerprint, requestHash), "1", ttlMs);
    if (!claimed) {
      return { duplicate: true, duplicateFingerprint: true, fingerprint, requestHash };
    }

    // Advisory fingerprint marker (sliding window) for DUPLICATE_RESOURCE_REQUEST.
    const fpSeen = await client.exists(this.fpKey(fingerprint));
    await client.setPx(this.fpKey(fingerprint), "1", ttlMs);

    return { duplicate: false, duplicateFingerprint: fpSeen, fingerprint, requestHash };
  }

  async forget(fingerprint: string, requestHash: string): Promise<void> {
    const client = await this.getClient();
    await client.del(this.hashKey(fingerprint, requestHash));
  }

  // Closes a lazily-created connection. Injected clients are owned by the caller.
  async close(): Promise<void> {
    if (this.closer) {
      const close = this.closer;
      this.closer = null;
      this.lazyClient = null;
      await close();
    }
  }
}

// Lazily loads ioredis so the demo never pulls it unless SAFE_REDIS_URL is set.
export async function createIoredisReplayClient(
  url: string
): Promise<{ client: ReplayRedisClient; close(): Promise<void> }> {
  const mod = await import("ioredis");
  const RedisCtor = (mod.default ?? mod) as typeof import("ioredis").default;
  const redis = new RedisCtor(url, {
    maxRetriesPerRequest: 1,
    connectTimeout: 1500,
    retryStrategy: () => null, // fail fast instead of reconnecting forever
    lazyConnect: false
  });

  const client: ReplayRedisClient = {
    async setNxPx(key, value, ttlMs) {
      const result = await redis.set(key, value, "PX", ttlMs, "NX");
      return result === "OK";
    },
    async setPx(key, value, ttlMs) {
      await redis.set(key, value, "PX", ttlMs);
    },
    async exists(key) {
      return (await redis.exists(key)) === 1;
    },
    async del(key) {
      await redis.del(key);
    }
  };

  return {
    client,
    close: async () => {
      await redis.quit();
    }
  };
}
