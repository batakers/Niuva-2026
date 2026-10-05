import type { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";

import {
  MAX_BOUNDARY_LENGTH,
  MAX_CORRELATION_ID_LENGTH,
  sanitizeSafeContext,
  type FailureEvent,
} from "./logger";

/**
 * Durable failure records (task 3.12, Req 8.2/8.3).
 *
 * The table only holds allowlisted ids/enums. The database cannot enforce
 * that, so `create` runs `safeContext` through `sanitizeSafeContext` and clamps
 * every string to the limits in `logger.ts` before writing.
 */

const MAX_ENUM_LENGTH = 64;
const MAX_LOOKUP_ROWS = 50;

export type StoredFailureEvent = Readonly<{
  id: string;
  boundary: string;
  correlationId: string;
  errorCode: string;
  kind: string;
  occurredAt: Date;
  safeContext?: Readonly<Record<string, string>>;
}>;

export interface FailureEventRepository {
  create(event: FailureEvent): Promise<void>;
  /** All events recorded under one correlation id, oldest first. */
  findByCorrelationId(correlationId: string): Promise<readonly StoredFailureEvent[]>;
}

function clamp(value: unknown, max: number): string {
  return String(value).slice(0, max);
}

export class PrismaFailureEventRepository implements FailureEventRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async create(event: FailureEvent): Promise<void> {
    const safeContext = sanitizeSafeContext(event.safeContext);
    const occurredAt =
      event.occurredAt instanceof Date && Number.isFinite(event.occurredAt.getTime())
        ? event.occurredAt
        : new Date();

    await this.prisma.failureEvent.create({
      data: {
        boundary: clamp(event.boundary, MAX_BOUNDARY_LENGTH),
        correlationId: clamp(event.correlationId, MAX_CORRELATION_ID_LENGTH),
        errorCode: clamp(event.errorCode, MAX_ENUM_LENGTH),
        kind: clamp(event.kind, MAX_ENUM_LENGTH),
        occurredAt,
        ...(safeContext === undefined ? {} : { safeContextJson: safeContext }),
      },
    });
  }

  async findByCorrelationId(
    correlationId: string,
  ): Promise<readonly StoredFailureEvent[]> {
    const rows = await this.prisma.failureEvent.findMany({
      orderBy: [{ occurredAt: "asc" }, { id: "asc" }],
      take: MAX_LOOKUP_ROWS,
      where: { correlationId: clamp(correlationId, MAX_CORRELATION_ID_LENGTH) },
    });

    return rows.map((row) => {
      // Re-sanitise on read: rows written by anything other than `create` are
      // not trusted to be clean.
      const safeContext = sanitizeSafeContext(row.safeContextJson);
      return {
        boundary: row.boundary,
        correlationId: row.correlationId,
        errorCode: row.errorCode,
        id: row.id,
        kind: row.kind,
        occurredAt: row.occurredAt,
        ...(safeContext === undefined ? {} : { safeContext }),
      };
    });
  }
}
