import { describe, expect, it, vi } from "vitest";

import type { FailureEvent } from "@/lib/observability/logger";
import {
  createPersistentFailureLogger,
  WEBHOOK_PERSIST_WINDOW_MS,
  WEBHOOK_THROTTLE_MAX_ENTRIES,
} from "@/lib/observability/persistent-logger";

function event(overrides: Partial<FailureEvent> = {}): FailureEvent {
  return {
    boundary: "webhook:midtrans",
    correlationId: "corr-1",
    errorCode: "UNAUTHORIZED",
    kind: "AUTHORIZATION_REJECTED",
    occurredAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

function setup() {
  let now = 1_000_000;
  const create = vi.fn().mockResolvedValue(undefined);
  const base = { record: vi.fn() };
  const logger = createPersistentFailureLogger({
    base,
    isDatabaseConfigured: () => true,
    nowMs: () => now,
    repository: () => ({ create, findByCorrelationId: vi.fn() }),
    schedule: (task) => void task(),
  });
  return {
    advance: (ms: number) => {
      now += ms;
    },
    base,
    create,
    logger,
  };
}

describe("webhook failure persistence throttle", () => {
  it("writes the first failure and skips repeats inside the window", () => {
    const { base, create, logger } = setup();

    logger.record(event());
    logger.record(event({ correlationId: "corr-2" }));
    logger.record(event({ correlationId: "corr-3" }));

    expect(create).toHaveBeenCalledTimes(1);
    expect(base.record).toHaveBeenCalledTimes(3);
  });

  it("writes again after the window has passed", () => {
    const { advance, create, logger } = setup();

    logger.record(event());
    advance(WEBHOOK_PERSIST_WINDOW_MS);
    logger.record(event({ correlationId: "corr-2" }));

    expect(create).toHaveBeenCalledTimes(2);
  });

  it("writes a different kind or boundary separately", () => {
    const { create, logger } = setup();

    logger.record(event());
    logger.record(event({ kind: "CODE_DEFECT" }));
    logger.record(event({ boundary: "webhook:biteship" }));

    expect(create).toHaveBeenCalledTimes(3);
  });

  it("keeps the throttle map bounded", () => {
    const { create, logger } = setup();

    for (let i = 0; i < WEBHOOK_THROTTLE_MAX_ENTRIES + 50; i += 1) {
      logger.record(event({ boundary: `webhook:provider-${i}` }));
    }
    expect(create).toHaveBeenCalledTimes(WEBHOOK_THROTTLE_MAX_ENTRIES + 50);

    // The oldest key was evicted, so it is written again (map did not grow).
    logger.record(event({ boundary: "webhook:provider-0" }));
    expect(create).toHaveBeenCalledTimes(WEBHOOK_THROTTLE_MAX_ENTRIES + 51);
  });

  it("does not throttle non-webhook boundaries", () => {
    const { create, logger } = setup();

    logger.record(event({ boundary: "page:/admin/orders" }));
    logger.record(event({ boundary: "page:/admin/orders" }));

    expect(create).toHaveBeenCalledTimes(2);
  });
});
