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

export type RateLimitStore = {
  /** Increments the window for a key and returns the resulting state. */
  consume: (
    key: string,
    limit: number,
    windowMs: number,
    now: number,
  ) => RateLimitResult;
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

const SWEEP_EVERY_CALLS = 256;

export type InMemoryRateLimitStoreOptions = {
  maxKeys?: number;
  /** Observability hook: invoked each time a full expiry sweep runs. */
  onSweep?: () => void;
};

export function createInMemoryRateLimitStore({
  maxKeys = 1_000,
  onSweep,
}: InMemoryRateLimitStoreOptions = {}): RateLimitStore {
  assertPositiveInteger(maxKeys, "maxKeys");

  // Map iteration order is insertion order; delete+set on access keeps the
  // first entry the least recently used one.
  const records = new Map<string, RateLimitRecord>();
  // Lower bound of the earliest resetAt in the map. A sweep is only useful
  // once this has passed, so most calls never scan.
  let earliestExpiry = Number.POSITIVE_INFINITY;
  let callsSinceSweep = 0;

  function sweepExpired(currentTime: number): void {
    onSweep?.();
    callsSinceSweep = 0;
    earliestExpiry = Number.POSITIVE_INFINITY;
    for (const [key, record] of records) {
      if (record.resetAt <= currentTime) {
        records.delete(key);
      } else if (record.resetAt < earliestExpiry) {
        earliestExpiry = record.resetAt;
      }
    }
  }

  return {
    consume(key, limit, windowMs, currentTime): RateLimitResult {
      callsSinceSweep += 1;
      if (
        callsSinceSweep >= SWEEP_EVERY_CALLS &&
        earliestExpiry <= currentTime
      ) {
        sweepExpired(currentTime);
      }

      let record = records.get(key);

      if (record !== undefined && record.resetAt <= currentTime) {
        // Expired window for this key: start a fresh one.
        records.delete(key);
        record = undefined;
      }

      if (record === undefined) {
        if (records.size >= maxKeys) {
          if (earliestExpiry <= currentTime) {
            sweepExpired(currentTime);
          }
          if (records.size >= maxKeys) {
            const leastRecentlyUsed = records.keys().next();
            if (leastRecentlyUsed.done !== true) {
              records.delete(leastRecentlyUsed.value);
            }
          }
        }

        record = {
          count: 0,
          resetAt: currentTime + windowMs,
        };
        if (record.resetAt < earliestExpiry) {
          earliestExpiry = record.resetAt;
        }
      } else {
        // Refresh recency.
        records.delete(key);
      }
      records.set(key, record);

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

export function createInMemoryRateLimiter({
  limit,
  maxKeys = 1_000,
  now = Date.now,
  windowMs,
}: InMemoryRateLimiterOptions): InMemoryRateLimiter {
  assertPositiveInteger(limit, "limit");
  assertPositiveInteger(maxKeys, "maxKeys");
  assertPositiveInteger(windowMs, "windowMs");

  const store = createInMemoryRateLimitStore({ maxKeys });

  return {
    check(key: string): RateLimitResult {
      const currentTime = now();
      const normalizedKey = key.trim();

      if (normalizedKey.length === 0) {
        throw new RangeError("Rate-limit key tidak boleh kosong.");
      }

      return store.consume(normalizedKey, limit, windowMs, currentTime);
    },
  };
}