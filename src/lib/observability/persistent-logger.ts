import { after } from "next/server";

import { getDatabaseEnvironment } from "@/lib/env/server";

import {
  createConsoleFailureLogger,
  type FailureEvent,
  type FailureLogger,
} from "./logger";
import {
  PrismaFailureEventRepository,
  type FailureEventRepository,
} from "./repository";

/**
 * Failure logger that writes the console line (unchanged) and then stores the
 * event in `failure_events` so staff can look it up by correlation id.
 *
 * Scope: install it only at boundaries whose failures staff must be able to
 * find again (admin pages, payment webhook; jobs and refunds later). Do not
 * use it for `apiError()` or `toAppErrorLogged`; console output is enough there.
 *
 * `record` stays synchronous and never throws. The database write is deferred:
 *
 * - Inside a Next request (Route Handler, Server Component, Server Function) it
 *   is handed to `after()`. On Vercel that keeps the invocation alive via
 *   `waitUntil` until the write settles; with `next start` the server drains
 *   pending `after()` callbacks on shutdown.
 * - Outside a request scope `after()` throws synchronously (unit tests,
 *   scripts). The write then runs fire-and-forget. That path can lose the write
 *   if the process exits first.
 *
 * The write task catches everything, so it cannot cause `unhandledRejection`,
 * and it never calls a `FailureLogger`, so a failed write cannot recurse. On
 * failure it prints one console line holding only the correlation id and the
 * error class name; raw database errors can contain connection details.
 *
 * Known limits: a write is lost if the database itself is the failure (the
 * `DATABASE_UNAVAILABLE` case; the console line remains), if the process is
 * killed before the deferred write runs, or if no database is configured (then
 * nothing is attempted).
 */

export type PersistentFailureLoggerDependencies = Readonly<{
  /** Receives every event first. Defaults to the console logger. */
  base?: FailureLogger;
  /** Reports whether a database is configured. Must not throw; a throw counts as "no". */
  isDatabaseConfigured?: () => boolean;
  /** Lazy so that no Prisma client is created unless a write happens. */
  repository?: () => FailureEventRepository;
  /** Runs the write after the response. Defaults to `after()` with a direct fallback. */
  schedule?: (task: () => Promise<void>) => void;
  /** Clock for the webhook write throttle. Defaults to `Date.now`. */
  nowMs?: () => number;
}>;

/**
 * Webhook endpoints are public, so unsigned/invalid calls can be sent at will.
 * Persist at most one row per (kind + boundary) per window for those
 * boundaries; the console line is still written for every event. The map is
 * in-process and bounded, so it cannot grow without limit.
 */
export const WEBHOOK_BOUNDARY_PREFIX = "webhook:";
export const WEBHOOK_PERSIST_WINDOW_MS = 60_000;
export const WEBHOOK_THROTTLE_MAX_ENTRIES = 200;

function createWebhookThrottle(nowMs: () => number): (event: FailureEvent) => boolean {
  const lastWrite = new Map<string, number>();

  return (event) => {
    const boundary = String(event.boundary);
    if (!boundary.startsWith(WEBHOOK_BOUNDARY_PREFIX)) {
      return true;
    }

    const now = nowMs();
    const key = `${event.kind}|${boundary.slice(0, 120)}`;
    const previous = lastWrite.get(key);
    if (previous !== undefined && now - previous < WEBHOOK_PERSIST_WINDOW_MS) {
      return false;
    }

    // Re-insert so Map order reflects recency; evict expired, then oldest.
    lastWrite.delete(key);
    if (lastWrite.size >= WEBHOOK_THROTTLE_MAX_ENTRIES) {
      for (const [k, t] of lastWrite) {
        if (now - t >= WEBHOOK_PERSIST_WINDOW_MS) lastWrite.delete(k);
      }
      while (lastWrite.size >= WEBHOOK_THROTTLE_MAX_ENTRIES) {
        const oldest = lastWrite.keys().next();
        if (oldest.done) break;
        lastWrite.delete(oldest.value);
      }
    }
    lastWrite.set(key, now);
    return true;
  };
}

function defaultIsDatabaseConfigured(): boolean {
  try {
    getDatabaseEnvironment();
    return true;
  } catch {
    return false;
  }
}

function defaultSchedule(task: () => Promise<void>): void {
  try {
    after(task);
  } catch {
    // Outside a request scope (or without waitUntil) after() throws. `task`
    // never rejects, so running it directly cannot produce unhandledRejection.
    void task();
  }
}

function describePersistFailure(correlationId: string, error: unknown): string {
  const errorName =
    error instanceof Error && /^[A-Za-z0-9_]{1,60}$/.test(error.name)
      ? error.name
      : "UnknownError";

  return JSON.stringify({
    correlationId: String(correlationId).slice(0, 100),
    errorName,
    event: "failure_persist_failed",
  });
}

export function createPersistentFailureLogger(
  dependencies: PersistentFailureLoggerDependencies = {},
): FailureLogger {
  const base = dependencies.base ?? createConsoleFailureLogger();
  const isDatabaseConfigured =
    dependencies.isDatabaseConfigured ?? defaultIsDatabaseConfigured;
  const createRepository =
    dependencies.repository ?? (() => new PrismaFailureEventRepository());
  const schedule = dependencies.schedule ?? defaultSchedule;
  const shouldPersist = createWebhookThrottle(
    dependencies.nowMs ?? (() => Date.now()),
  );

  return {
    record(event: FailureEvent): void {
      try {
        base.record(event);
      } catch {
        // Console logging must not block persistence or change the response.
      }

      try {
        if (!isDatabaseConfigured()) {
          return;
        }

        if (!shouldPersist(event)) {
          return;
        }

        schedule(async () => {
          try {
            await createRepository().create(event);
          } catch (error) {
            try {
              console.error(describePersistFailure(event.correlationId, error));
            } catch {
              // Nothing left to do.
            }
          }
        });
      } catch {
        // Persisting is best-effort: never change what the user sees.
      }
    },
  };
}
