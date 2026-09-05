import type { AuditActorType, Prisma, PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import {
  AuditLogRepository,
  type AuditLogInput,
} from "@/modules/audit/repository";
import { sanitizeAuditMetadata } from "@/modules/audit/metadata";

import type { TransitionAuditEvent, TransitionAuditWriter } from "./transition";

export type DomainAuditEvent = Readonly<{
  action: string;
  actorId?: string;
  actorType: AuditActorType;
  afterJson?: Prisma.InputJsonObject;
  beforeJson?: Prisma.InputJsonObject;
  entityId: string;
  entityType: string;
  metadata?: Readonly<Record<string, unknown>>;
}>;

export type AuditRecorder = (event: DomainAuditEvent) => void | Promise<void>;

export function createPrismaAuditRecorder(
  prisma?: PrismaClient,
): AuditRecorder {
  const repository = new AuditLogRepository(prisma ?? getPrismaClient());

  return (event) => {
    const input: AuditLogInput = {
      action: event.action,
      actorId: event.actorId,
      actorType: event.actorType,
      afterJson: event.afterJson,
      beforeJson: event.beforeJson,
      entityId: event.entityId,
      entityType: event.entityType,
      metadata: sanitizeAuditMetadata(event.metadata),
    };

    return repository.record(input).then(() => undefined);
  };
}

export function createTransitionAuditRecorder(
  recorder: AuditRecorder,
  input: Readonly<{
    actorId?: string;
    actorType: AuditActorType;
  }>,
): TransitionAuditWriter {
  return (event: TransitionAuditEvent) => {
    if (event.entityId === undefined) {
      return;
    }

    return recorder({
      action: "state.transition",
      actorId: input.actorId,
      actorType: input.actorType,
      afterJson: { status: event.to },
      beforeJson: { status: event.from },
      entityId: event.entityId,
      entityType: event.entityType,
      metadata: {
        result: event.outcome,
      },
    });
  };
}

export async function recordAudit(
  recorder: AuditRecorder | undefined,
  event: DomainAuditEvent,
): Promise<void> {
  if (recorder !== undefined) {
    await recorder(event);
    return;
  }

  await createPrismaAuditRecorder()(event);
}

