import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { getPrismaClient } from "@/lib/db/prisma";
import { PrismaRequestRateLimitStore } from "@/lib/security/shared-rate-limit";

const prisma = getPrismaClient();

describe("shared request rate limits", () => {
  it("shares one atomic allowance between independent instances", async () => {
    const first = new PrismaRequestRateLimitStore(getPrismaClient()), second = new PrismaRequestRateLimitStore(getPrismaClient());
    const namespace = `integration-${randomUUID()}`, now = Date.now();
    const results = await Promise.all(Array.from({ length: 12 }, (_, index) => (index % 2 ? first : second).consume(namespace, "same-actor", 5, 60_000, now)));
    expect(results.filter(result => result.allowed)).toHaveLength(5);
    expect(results.filter(result => !result.allowed)).toHaveLength(7);
    expect(results.every(result => result.resetAt === now + 60_000)).toBe(true);
    expect(await first.consume(namespace, "another-actor", 5, 60_000, now)).toMatchObject({ allowed: true, remaining: 4 });
    expect(await second.consume(`${namespace}-other-endpoint`, "same-actor", 5, 60_000, now)).toMatchObject({ allowed: true, remaining: 4 });
    expect(await first.consume(namespace, "same-actor", 5, 60_000, now + 60_000)).toMatchObject({ allowed: true, remaining: 4, resetAt: now + 120_000 });
    const expiredKey = randomUUID().replaceAll("-", "");
    await prisma.requestRateLimit.create({ data: { key: expiredKey, namespace, count: 1, resetAt: new Date(now + 60_000) } });
    await first.consume(namespace, "cleanup-trigger", 5, 60_000, now + 120_000);
    expect(await prisma.requestRateLimit.findUnique({ where: { key: expiredKey } })).toBeNull();
  });
  it("stores a scoped hash rather than the incoming actor key", async () => {
    const namespace = `privacy-${randomUUID()}`, actor = "example-customer@fixture.test";
    await new PrismaRequestRateLimitStore(prisma).consume(namespace, actor, 2, 60_000, Date.now());
    const rows = await prisma.requestRateLimit.findMany({ where: { namespace } });
    expect(rows).toHaveLength(1);
    expect(rows[0].key).toMatch(/^[a-f0-9]{64}$/);
    expect(JSON.stringify(rows)).not.toContain(actor);
  });
});
