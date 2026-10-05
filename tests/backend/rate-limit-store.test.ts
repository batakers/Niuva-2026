import { describe, expect, it } from "vitest";

import {
  createInMemoryRateLimitStore,
  type RateLimitStore,
} from "@/lib/security/rate-limit";

describe("RateLimitStore contract (in-memory implementation)", () => {
  it("counts per key within a window and resets after it", () => {
    const store: RateLimitStore = createInMemoryRateLimitStore();

    expect(store.consume("a", 2, 1_000, 0)).toMatchObject({ allowed: true, remaining: 1 });
    expect(store.consume("a", 2, 1_000, 10)).toMatchObject({ allowed: true, remaining: 0 });
    expect(store.consume("a", 2, 1_000, 20)).toMatchObject({
      allowed: false,
      resetAt: 1_000,
      retryAfterSeconds: 1,
    });
    expect(store.consume("b", 2, 1_000, 20).allowed).toBe(true);
    expect(store.consume("a", 2, 1_000, 1_000)).toMatchObject({ allowed: true, remaining: 1 });
  });

  // Deliberate contract change (task 5.4): capacity no longer rejects new
  // actors; it evicts expired keys first, then the least recently used one.
  it("accepts a new key at capacity by evicting the least recently used key", () => {
    const store = createInMemoryRateLimitStore({ maxKeys: 2 });

    store.consume("a", 1, 1_000, 0);
    store.consume("b", 1, 1_000, 1);
    expect(store.consume("c", 1, 1_000, 2)).toMatchObject({ allowed: true, remaining: 0 });
    // "a" was evicted, so it starts a fresh window instead of being limited.
    expect(store.consume("a", 1, 1_000, 3).allowed).toBe(true);
  });

  it("evicts expired keys before any live key at capacity", () => {
    const store = createInMemoryRateLimitStore({ maxKeys: 2 });

    store.consume("live", 1, 10_000, 0);
    store.consume("short", 1, 100, 1);
    store.consume("live", 1, 10_000, 2); // "live" becomes most recent
    store.consume("short2", 1, 100, 3); // evicts LRU "short"
    store.consume("x", 1, 10_000, 500); // "short2" expired: it goes, not "live"

    expect(store.consume("live", 1, 10_000, 501).allowed).toBe(false);
  });

  it("never rejects a new actor across unique keys beyond capacity", () => {
    const store = createInMemoryRateLimitStore({ maxKeys: 5 });

    for (let index = 0; index < 100; index += 1) {
      expect(store.consume(`actor-${index}`, 1, 60_000, index).allowed).toBe(true);
    }
  });

  it("keeps an active heavy actor while idle actors are evicted", () => {
    const store = createInMemoryRateLimitStore({ maxKeys: 3 });

    store.consume("heavy", 3, 60_000, 0);
    for (let index = 0; index < 20; index += 1) {
      store.consume(`idle-${index}`, 3, 60_000, index + 1);
      store.consume("heavy", 3, 60_000, index + 1);
    }

    expect(store.consume("heavy", 3, 60_000, 50).allowed).toBe(false);
  });

  it("holds at most maxKeys keys", () => {
    const store = createInMemoryRateLimitStore({ maxKeys: 4 });

    for (let index = 0; index < 50; index += 1) {
      store.consume(`k-${index}`, 1, 60_000, index);
    }

    // The newest four are still limited; older keys were evicted (fresh window).
    for (const index of [46, 47, 48, 49]) {
      expect(store.consume(`k-${index}`, 1, 60_000, 60).allowed).toBe(false);
    }
    expect(store.consume("k-0", 1, 60_000, 61).allowed).toBe(true);
  });

  it("sweeps expired keys in amortized fashion, not on every call", () => {
    let sweeps = 0;
    const store = createInMemoryRateLimitStore({
      maxKeys: 10_000,
      onSweep: () => {
        sweeps += 1;
      },
    });

    // Nothing ever expires: no sweeps at all.
    for (let index = 0; index < 2_000; index += 1) {
      store.consume(`live-${index}`, 1, 1_000_000, index);
    }
    expect(sweeps).toBe(0);

    // Short-lived keys expire; sweeps run far less often than calls.
    for (let index = 0; index < 2_000; index += 1) {
      store.consume(`short-${index}`, 1, 1, 10_000 + index * 2);
    }
    expect(sweeps).toBeGreaterThan(0);
    expect(sweeps).toBeLessThan(2_000 / 100);
  });
});
