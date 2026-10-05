import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import type { FailureEvent, FailureLogger } from "@/lib/observability/logger";
import { createPersistentFailureLogger } from "@/lib/observability/persistent-logger";
import {
  PrismaFailureEventRepository,
  type FailureEventRepository,
} from "@/lib/observability/repository";

type FakeFailureEventDelegate = {
  create: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
};

function fakePrisma(): { delegate: FakeFailureEventDelegate; prisma: PrismaClient } {
  const delegate: FakeFailureEventDelegate = {
    create: vi.fn().mockResolvedValue(undefined),
    findMany: vi.fn().mockResolvedValue([]),
  };
  return { delegate, prisma: { failureEvent: delegate } as unknown as PrismaClient };
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

async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe("PrismaFailureEventRepository", () => {
  it("stores the event with sanitised safe context", async () => {
    const { delegate, prisma } = fakePrisma();
    const repository = new PrismaFailureEventRepository(prisma);

    await repository.create(
      event({
        safeContext: {
          orderId: "ord_123",
          stage: "verify",
          customerEmail: "person@example.test",
          authToken: "abc",
          note: "free text with spaces",
          contact: "person@example.test",
          empty: "",
        },
      }),
    );

    expect(delegate.create).toHaveBeenCalledTimes(1);
    expect(delegate.create).toHaveBeenCalledWith({
      data: {
        boundary: "page:/admin/orders",
        correlationId: "11111111-1111-4111-8111-111111111111",
        errorCode: "INTERNAL_ERROR",
        kind: "DATABASE_UNAVAILABLE",
        occurredAt: new Date("2026-10-03T10:00:00.000Z"),
        safeContextJson: { orderId: "ord_123", stage: "verify" },
      },
    });
  });

  it("omits safeContextJson when nothing survives sanitising", async () => {
    const { delegate, prisma } = fakePrisma();

    await new PrismaFailureEventRepository(prisma).create(
      event({ safeContext: { email: "a@b.test", message: "has spaces" } }),
    );

    const data = delegate.create.mock.calls[0]?.[0].data as Record<string, unknown>;
    expect("safeContextJson" in data).toBe(false);
  });

  it("clamps boundary, correlation id, and enum strings", async () => {
    const { delegate, prisma } = fakePrisma();

    await new PrismaFailureEventRepository(prisma).create(
      event({
        boundary: `page:/${"x".repeat(300)}`,
        correlationId: "c".repeat(300),
        errorCode: "E".repeat(200) as FailureEvent["errorCode"],
        kind: "K".repeat(200) as FailureEvent["kind"],
      }),
    );

    const data = delegate.create.mock.calls[0]?.[0].data as Record<string, string>;
    expect(data.boundary).toHaveLength(120);
    expect(data.correlationId).toHaveLength(100);
    expect(data.errorCode).toHaveLength(64);
    expect(data.kind).toHaveLength(64);
  });

  it("looks up by correlation id, oldest first, and re-sanitises stored context", async () => {
    const { delegate, prisma } = fakePrisma();
    delegate.findMany.mockResolvedValue([
      {
        boundary: "webhook:midtrans",
        correlationId: "abc",
        errorCode: "INTERNAL_ERROR",
        id: "row-1",
        kind: "CODE_DEFECT",
        occurredAt: new Date("2026-10-03T10:00:00.000Z"),
        safeContextJson: { stage: "parse", email: "x@y.test" },
      },
      {
        boundary: "webhook:midtrans",
        correlationId: "abc",
        errorCode: "INTERNAL_ERROR",
        id: "row-2",
        kind: "CODE_DEFECT",
        occurredAt: new Date("2026-10-03T10:00:01.000Z"),
        safeContextJson: null,
      },
    ]);

    const rows = await new PrismaFailureEventRepository(prisma).findByCorrelationId("abc");

    expect(delegate.findMany).toHaveBeenCalledWith({
      orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
      take: 50,
      where: { correlationId: "abc" },
    });
    expect(rows.map((row) => row.id)).toEqual(["row-1", "row-2"]);
    expect(rows[0]?.safeContext).toEqual({ stage: "parse" });
    expect(rows[1]?.safeContext).toBeUndefined();
  });
});

describe("createPersistentFailureLogger", () => {
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown): void => {
    unhandled.push(reason);
  };

  beforeEach(() => {
    unhandled.length = 0;
    process.on("unhandledRejection", onUnhandled);
    consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.off("unhandledRejection", onUnhandled);
  });

  it("writes the console line and stores the event", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const logger = createPersistentFailureLogger({
      isDatabaseConfigured: () => true,
      repository: () => ({ create, findByCorrelationId: vi.fn() }),
      schedule: (task) => void task(),
    });

    logger.record(event({ safeContext: { stage: "verify" } }));
    await flush();

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(String(consoleSpy.mock.calls[0]?.[0])).toContain('"event":"failure"');
    expect(create).toHaveBeenCalledTimes(1);
    expect(create.mock.calls[0]?.[0]).toMatchObject({
      boundary: "page:/admin/orders",
      correlationId: "11111111-1111-4111-8111-111111111111",
    });
  });

  it("neither schedules nor builds a repository when no database is configured", () => {
    const schedule = vi.fn();
    const repository = vi.fn();
    const logger = createPersistentFailureLogger({
      isDatabaseConfigured: () => false,
      repository,
      schedule,
    });

    logger.record(event());

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(schedule).not.toHaveBeenCalled();
    expect(repository).not.toHaveBeenCalled();
  });

  it("treats a throwing configuration check as 'no database'", () => {
    const schedule = vi.fn();
    const logger = createPersistentFailureLogger({
      isDatabaseConfigured: () => {
        throw new Error("boom");
      },
      schedule,
    });

    expect(() => logger.record(event())).not.toThrow();
    expect(schedule).not.toHaveBeenCalled();
  });

  it("swallows a rejected write without unhandledRejection, leaking details, or re-logging", async () => {
    const base: FailureLogger = { record: vi.fn() };
    const secret = "postgresql://user:hunter2@db.internal:5432/niuva";
    const failing: FailureEventRepository = {
      create: vi.fn().mockRejectedValue(new Error(`connect failed ${secret}`)),
      findByCorrelationId: vi.fn(),
    };
    const logger = createPersistentFailureLogger({
      base,
      isDatabaseConfigured: () => true,
      repository: () => failing,
      schedule: (task) => void task(),
    });

    expect(() => logger.record(event())).not.toThrow();
    await flush();
    await flush();

    expect(unhandled).toHaveLength(0);
    expect(base.record).toHaveBeenCalledTimes(1);
    expect(failing.create).toHaveBeenCalledTimes(1);
    const summary = String(consoleSpy.mock.calls.at(-1)?.[0]);
    expect(JSON.parse(summary)).toEqual({
      correlationId: "11111111-1111-4111-8111-111111111111",
      errorName: "Error",
      event: "failure_persist_failed",
    });
    expect(summary).not.toContain("hunter2");
    expect(summary).not.toContain("connect failed");
  });

  it("swallows a repository factory that throws and a scheduler that throws", async () => {
    const throwingFactory = createPersistentFailureLogger({
      isDatabaseConfigured: () => true,
      repository: () => {
        throw new Error("no client");
      },
      schedule: (task) => void task(),
    });
    const throwingSchedule = createPersistentFailureLogger({
      isDatabaseConfigured: () => true,
      schedule: () => {
        throw new Error("no scheduler");
      },
    });

    expect(() => throwingFactory.record(event())).not.toThrow();
    expect(() => throwingSchedule.record(event())).not.toThrow();
    await flush();
    expect(unhandled).toHaveLength(0);
  });

  it("keeps persisting when the base logger throws", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const logger = createPersistentFailureLogger({
      base: {
        record: () => {
          throw new Error("console broke");
        },
      },
      isDatabaseConfigured: () => true,
      repository: () => ({ create, findByCorrelationId: vi.fn() }),
      schedule: (task) => void task(),
    });

    expect(() => logger.record(event())).not.toThrow();
    await flush();

    expect(create).toHaveBeenCalledTimes(1);
  });

  it("falls back to a direct write when after() is called outside a request scope", async () => {
    const create = vi.fn().mockResolvedValue(undefined);
    const logger = createPersistentFailureLogger({
      isDatabaseConfigured: () => true,
      repository: () => ({ create, findByCorrelationId: vi.fn() }),
    });

    expect(() => logger.record(event())).not.toThrow();
    await flush();

    expect(create).toHaveBeenCalledTimes(1);
    expect(unhandled).toHaveLength(0);
  });

  it("does not write by default when DATABASE_URL is not configured", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const repository = vi.fn();
    const logger = createPersistentFailureLogger({ repository });

    logger.record(event());
    await flush();

    vi.unstubAllEnvs();
    expect(repository).not.toHaveBeenCalled();
  });
});
