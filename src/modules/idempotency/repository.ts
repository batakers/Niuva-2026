import {
  IdempotencyStatus,
  Prisma,
  type PrismaClient,
} from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";

import {
  resolveIdempotency,
  type IdempotencyResolution,
  type StoredIdempotencyResponse,
} from "./state";

export type IdempotencyReservationInput = Readonly<{
  expiresAt: Date;
  key: string;
  requestHash: string;
  scope: string;
}>;

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
  );
}

export class IdempotencyRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async reserve(
    input: IdempotencyReservationInput,
    now: Date = new Date(),
  ): Promise<IdempotencyResolution> {
    try {
      await this.prisma.idempotencyRecord.create({
        data: {
          expiresAt: input.expiresAt,
          idempotencyKey: input.key,
          requestHash: input.requestHash,
          scope: input.scope,
          status: IdempotencyStatus.IN_PROGRESS,
        },
      });

      return { kind: "RESERVED" };
    } catch (error) {
      if (!isUniqueConstraintViolation(error)) {
        throw error;
      }

      const existing = await this.prisma.idempotencyRecord.findUnique({
        where: {
          scope_idempotencyKey: {
            idempotencyKey: input.key,
            scope: input.scope,
          },
        },
        select: {
          completedAt: true,
          expiresAt: true,
          requestHash: true,
          responseJson: true,
          responseStatus: true,
          status: true,
        },
      });

      if (existing === null) {
        throw error;
      }

      return resolveIdempotency(existing, input.requestHash, now);
    }
  }

  async complete(
    input: Readonly<{
      key: string;
      response: StoredIdempotencyResponse;
      responseStatus: number;
      scope: string;
    }>,
  ) {
    return this.prisma.idempotencyRecord.update({
      where: {
        scope_idempotencyKey: {
          idempotencyKey: input.key,
          scope: input.scope,
        },
      },
      data: {
        completedAt: new Date(),
        responseJson: input.response,
        responseStatus: input.responseStatus,
        status: IdempotencyStatus.COMPLETED,
      },
    });
  }

  async fail(
    input: Readonly<{
      key: string;
      response?: StoredIdempotencyResponse;
      responseStatus?: number;
      scope: string;
    }>,
  ) {
    return this.prisma.idempotencyRecord.update({
      where: {
        scope_idempotencyKey: {
          idempotencyKey: input.key,
          scope: input.scope,
        },
      },
      data: {
        responseJson: input.response,
        responseStatus: input.responseStatus,
        status: IdempotencyStatus.FAILED,
      },
    });
  }
}
