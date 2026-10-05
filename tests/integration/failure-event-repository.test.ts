import { afterAll, beforeEach, describe, expect, it } from "vitest";

import { getPrismaClient } from "@/lib/db/prisma";
import type { FailureEvent } from "@/lib/observability/logger";
import { PrismaFailureEventRepository } from "@/lib/observability/repository";

const prisma = getPrismaClient();
const repository = new PrismaFailureEventRepository(prisma);

// `failure_events` has no foreign keys, so cleaning it cannot touch other tables.
async function clean(): Promise<void> {
  await prisma.$executeRaw`TRUNCATE TABLE "failure_events"`;
}

function event(overrides: Partial<FailureEvent> = {}): FailureEvent {
  return {
    boundary: "page:/admin/orders",
    correlationId: "11111111-1111-4111-8111-111111111111",
    errorCode: "INTERNAL_ERROR",
    kind: "DATABASE_UNAVAILABLE",
    occurredAt: new Date("2026-10-03T10:00:00.000Z"),
    ...overrides,
  };
}

beforeEach(clean);
afterAll(async () => {
  await clean();
  await prisma.$disconnect();
});

describe("failure_events repository PostgreSQL", () => {
  it("returns the stored row by correlation id", async () => {
    await repository.create(
      event({ safeContext: { orderId: "ord_123", stage: "verify" } }),
    );

    const rows = await repository.findByCorrelationId(
      "11111111-1111-4111-8111-111111111111",
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      boundary: "page:/admin/orders",
      correlationId: "11111111-1111-4111-8111-111111111111",
      errorCode: "INTERNAL_ERROR",
      kind: "DATABASE_UNAVAILABLE",
      safeContext: { orderId: "ord_123", stage: "verify" },
    });
    expect(rows[0]?.occurredAt.toISOString()).toBe("2026-10-03T10:00:00.000Z");
    expect(rows[0]?.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("drops sensitive keys and email/space values before storing", async () => {
    await repository.create(
      event({
        safeContext: {
          stage: "process",
          customerEmail: "person@example.test",
          contact: "person@example.test",
          note: "free text with spaces",
          signatureKey: "abc",
          authToken: "abc",
        },
      }),
    );

    const [raw] = await prisma.failureEvent.findMany();
    expect(raw?.safeContextJson).toEqual({ stage: "process" });
    expect(JSON.stringify(raw)).not.toMatch(/example\.test|free text|signature|token/i);
  });

  it("stores no safeContextJson when nothing survives sanitising", async () => {
    await repository.create(event({ safeContext: { email: "a@b.test" } }));

    const [raw] = await prisma.failureEvent.findMany();
    expect(raw?.safeContextJson).toBeNull();
  });

  it("finds both events that share a correlation id, oldest first", async () => {
    await repository.create(
      event({ occurredAt: new Date("2026-10-03T10:00:02.000Z"), kind: "CODE_DEFECT" }),
    );
    await repository.create(
      event({ occurredAt: new Date("2026-10-03T10:00:01.000Z") }),
    );
    await repository.create(
      event({ correlationId: "22222222-2222-4222-8222-222222222222" }),
    );

    const rows = await repository.findByCorrelationId(
      "11111111-1111-4111-8111-111111111111",
    );

    expect(rows.map((row) => row.kind)).toEqual([
      "DATABASE_UNAVAILABLE",
      "CODE_DEFECT",
    ]);
  });

  it("returns an empty list for an unknown correlation id", async () => {
    await expect(repository.findByCorrelationId("does-not-exist")).resolves.toEqual([]);
  });

  it("has no column that could hold payload, header, body, token, or PII", async () => {
    const columns = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'failure_events' ORDER BY column_name
    `;

    expect(columns.map((column) => column.column_name)).toEqual([
      "boundary",
      "correlation_id",
      "error_code",
      "id",
      "kind",
      "occurred_at",
      "safe_context_json",
    ]);
  });
});
