import type {
  AuditActorType,
  Prisma,
  PrismaClient,
} from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";

import type { AuditMetadata } from "./metadata";

export type AuditLogInput = Readonly<{
  action: string;
  actorId?: string;
  actorType: AuditActorType;
  afterJson?: Prisma.InputJsonObject;
  beforeJson?: Prisma.InputJsonObject;
  entityId: string;
  entityType: string;
  metadata?: AuditMetadata;
}>;

export class AuditLogRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async record(input: AuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        action: input.action,
        actorId: input.actorId,
        actorType: input.actorType,
        afterJson: input.afterJson,
        beforeJson: input.beforeJson,
        entityId: input.entityId,
        entityType: input.entityType,
        metadataJson: input.metadata,
      },
    });
  }
}
