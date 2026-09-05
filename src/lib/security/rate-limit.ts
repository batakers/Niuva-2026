export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

export type InMemoryRateLimiterOptions = {
  limit: number;
  maxKeys?: number;
  now?: () => number;
  windowMs: number;
};

export type InMemoryRateLimiter = {
  check: (key: string) => RateLimitResult;
};

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} harus berupa integer positif.`);
  }
}

export function createInMemoryRateLimiter({
  limit,
  maxKeys = 1_000,
  now = Date.now,
  windowMs,
}: InMemoryRateLimiterOptions): InMemoryRateLimiter {
  assertPositiveInteger(limit, "limit");
  assertPositiveInteger(maxKeys, "maxKeys");
  assertPositiveInteger(windowMs, "windowMs");

  const records = new Map<string, RateLimitRecord>();

  function clearExpiredRecords(currentTime: number): void {
    for (const [key, record] of records) {
      if (record.resetAt <= currentTime) {
        records.delete(key);
      }
    }
  }

  return {
    check(key: string): RateLimitResult {
      const currentTime = now();
      const normalizedKey = key.trim();

      if (normalizedKey.length === 0) {
        throw new RangeError("Rate-limit key tidak boleh kosong.");
      }

      clearExpiredRecords(currentTime);
      let record = records.get(normalizedKey);

      if (record === undefined) {
        if (records.size >= maxKeys) {
          return {
            allowed: false,
            limit,
            remaining: 0,
            resetAt: currentTime + windowMs,
            retryAfterSeconds: Math.max(1, Math.ceil(windowMs / 1_000)),
          };
        }

        record = {
          count: 0,
          resetAt: currentTime + windowMs,
        };
        records.set(normalizedKey, record);
      }

      record.count += 1;
      const allowed = record.count <= limit;

      return {
        allowed,
        limit,
        remaining: Math.max(0, limit - record.count),
        resetAt: record.resetAt,
        retryAfterSeconds: Math.max(
          1,
          Math.ceil((record.resetAt - currentTime) / 1_000),
        ),
      };
    },
  };
}
