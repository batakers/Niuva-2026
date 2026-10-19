import { createHash } from "node:crypto";
import type { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { deploymentEnvironmentShape, resolveDeploymentTier } from "@/lib/env/deployment";
import { createInMemoryRateLimiter, type InMemoryRateLimiterOptions, type RateLimitResult } from "./rate-limit";

const EXPIRED_SWEEP_INTERVAL_MS = 60_000;
const EXPIRED_SWEEP_BATCH_SIZE = 500;
let lastExpiredSweepAt = Number.NEGATIVE_INFINITY;

export class PrismaRequestRateLimitStore {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}
  async consume(namespace: string, actor: string, limit: number, windowMs: number, now: number): Promise<RateLimitResult> {
    if (!namespace.trim() || !actor.trim() || !Number.isSafeInteger(limit) || limit < 1 || limit > 1_000_000 || !Number.isSafeInteger(windowMs) || windowMs < 1 || !Number.isSafeInteger(now)) throw new RangeError("Konfigurasi rate limit tidak valid.");
    if (now - lastExpiredSweepAt >= EXPIRED_SWEEP_INTERVAL_MS) {
      await this.prisma.$executeRaw`
        DELETE FROM request_rate_limits
        WHERE key IN (
          SELECT key FROM request_rate_limits
          WHERE reset_at <= ${new Date(now)}
          ORDER BY reset_at
          LIMIT ${EXPIRED_SWEEP_BATCH_SIZE}
        )
      `;
      lastExpiredSweepAt = now;
    }
    const key = createHash("sha256").update(JSON.stringify([namespace, actor])).digest("hex");
    const rows = await this.prisma.$queryRaw<Readonly<{ count: number; resetAt: Date }>[]>`
      INSERT INTO request_rate_limits (key, namespace, count, reset_at)
      VALUES (${key}, ${namespace}, 1, ${new Date(now + windowMs)})
      ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN request_rate_limits.reset_at <= ${new Date(now)} THEN 1 ELSE LEAST(request_rate_limits.count + 1, ${limit + 1}) END,
        reset_at = CASE WHEN request_rate_limits.reset_at <= ${new Date(now)} THEN ${new Date(now + windowMs)} ELSE request_rate_limits.reset_at END
      RETURNING count, reset_at AS "resetAt"
    `;
    const row = rows[0];
    if (!row) throw new Error("Rate limit database tidak mengembalikan hasil.");
    return { allowed: row.count <= limit, limit, remaining: Math.max(0, limit - row.count), resetAt: row.resetAt.getTime(), retryAfterSeconds: Math.max(1, Math.ceil((row.resetAt.getTime() - now) / 1000)) };
  }
}

/** Local fixtures keep their bounded memory store; hosted runtimes share PostgreSQL and fail closed on DB errors. */
export function createRuntimeRateLimiter(options: InMemoryRateLimiterOptions & Readonly<{ namespace: string }>) {
  const local = createInMemoryRateLimiter(options);
  return { async check(key: string): Promise<RateLimitResult> {
    const tier = resolveDeploymentTier({ nodeEnv: process.env.NODE_ENV, tier: deploymentEnvironmentShape.NIUVA_DEPLOYMENT_TIER.parse(process.env.NIUVA_DEPLOYMENT_TIER) });
    if (tier === "local-test") return local.check(key);
    return new PrismaRequestRateLimitStore().consume(options.namespace, key, options.limit, options.windowMs, (options.now ?? Date.now)());
  } };
}
