export interface ReplayCheckResult {
  duplicate: boolean;
  duplicateFingerprint: boolean;
  fingerprint: string;
  requestHash: string;
}

interface SeenRequest {
  expiresAtMs: number;
}

export class ReplayGuard {
  private readonly seen = new Map<string, Map<string, SeenRequest>>();

  checkAndRemember(
    fingerprint: string,
    requestHash: string,
    windowSeconds: number,
    nowMs = Date.now()
  ): ReplayCheckResult {
    this.prune(nowMs);

    const hashesForFingerprint = this.seen.get(fingerprint) ?? new Map<string, SeenRequest>();
    const existing = hashesForFingerprint.get(requestHash);
    if (existing && existing.expiresAtMs > nowMs) {
      return { duplicate: true, duplicateFingerprint: true, fingerprint, requestHash };
    }

    const duplicateFingerprint = hashesForFingerprint.size > 0;
    hashesForFingerprint.set(requestHash, {
      expiresAtMs: nowMs + windowSeconds * 1000
    });
    this.seen.set(fingerprint, hashesForFingerprint);

    return { duplicate: false, duplicateFingerprint, fingerprint, requestHash };
  }

  private prune(nowMs: number) {
    for (const [fingerprint, hashes] of this.seen.entries()) {
      for (const [requestHash, entry] of hashes.entries()) {
        if (entry.expiresAtMs <= nowMs) {
          hashes.delete(requestHash);
        }
      }
      if (hashes.size === 0) {
        this.seen.delete(fingerprint);
      }
    }
  }
}
