import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import type { AdminAccess } from "@/lib/auth/admin";
import { appError } from "@/modules/shared/errors";
import { activityVisibilityWhere } from "../activity-timeline";
import { PrismaActivityTargetReader } from "./target-repository";

const eventSelect = { id: true, entityId: true, entityType: true, action: true, actorId: true, createdAt: true, afterJson: true } satisfies Prisma.AuditLogSelect;
export type NotificationEvent = Prisma.AuditLogGetPayload<{ select: typeof eventSelect }>;

export class PrismaAdminNotificationRepository {
  readonly targets: PrismaActivityTargetReader;
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) { this.targets = new PrismaActivityTargetReader(prisma); }

  async assertActive(access: AdminAccess, db: Prisma.TransactionClient = this.prisma): Promise<void> {
    const profile = await db.adminProfile.findFirst({ where: { id: access.profile.id, authUserId: access.authUserId, isActive: true, role: access.profile.role }, select: { id: true } });
    if (!profile) throw appError("FORBIDDEN");
  }
  async hasState(access: AdminAccess): Promise<boolean> {
    return (await this.prisma.adminNotificationState.findUnique({ where: { profileId: access.profile.id }, select: { profileId: true } })) !== null;
  }
  async activate(access: AdminAccess): Promise<void> {
    await this.prisma.$transaction(async tx => {
      await this.assertActive(access, tx);
      // Prisma's read-then-create upsert can race when two first boots use the
      // same profile. Let PostgreSQL arbitrate the primary-key conflict so a
      // concurrent bootstrap remains idempotent instead of surfacing P2002.
      await tx.$executeRaw(Prisma.sql`INSERT INTO admin_notification_states (profile_id)
        VALUES (${access.profile.id}::uuid)
        ON CONFLICT (profile_id) DO NOTHING`);
      // Suppress the existing snapshot without marking anything read. An event
      // committed later remains discoverable even if it has the same timestamp.
      await tx.$executeRaw(Prisma.sql`INSERT INTO admin_notification_receipts (profile_id, audit_log_id, toast_claimed_at)
        SELECT ${access.profile.id}::uuid, id, clock_timestamp() FROM audit_logs
        ON CONFLICT (profile_id, audit_log_id) DO NOTHING`);
    });
  }
  async page(access: AdminAccess, cursor: string | undefined, unread: boolean) {
    const visible = activityVisibilityWhere(access.profile.role) ?? {};
    if (cursor && !await this.prisma.auditLog.findFirst({ where: { AND: [visible, { id: cursor }] }, select: { id: true } })) throw appError("VALIDATION_ERROR", { message: "Riwayat berubah. Muat ulang pemberitahuan." });
    return this.prisma.auditLog.findMany({
      where: { AND: [visible, ...(unread ? [{ notificationReceipts: { none: { profileId: access.profile.id, readAt: { not: null } } } }] : [])] },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 31,
      select: { ...eventSelect, notificationReceipts: { where: { profileId: access.profile.id }, select: { readAt: true } } },
    });
  }
  async unreadCount(access: AdminAccess): Promise<number> {
    return this.prisma.auditLog.count({ where: { AND: [activityVisibilityWhere(access.profile.role) ?? {}, { notificationReceipts: { none: { profileId: access.profile.id, readAt: { not: null } } } }] } });
  }
  async pending(access: AdminAccess): Promise<readonly NotificationEvent[]> {
    return this.prisma.auditLog.findMany({ where: { AND: [activityVisibilityWhere(access.profile.role) ?? {}, { notificationReceipts: { none: { profileId: access.profile.id } } }] }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 100, select: eventSelect });
  }
  async claim(access: AdminAccess, eventId: string): Promise<boolean> {
    const result = await this.prisma.adminNotificationReceipt.createMany({ data: [{ profileId: access.profile.id, auditLogId: eventId, toastClaimedAt: new Date() }], skipDuplicates: true });
    return result.count === 1;
  }
  async markRead(access: AdminAccess, ids: readonly string[]): Promise<void> {
    await this.prisma.$transaction(async tx => {
      await this.assertActive(access, tx);
      const visible = await tx.auditLog.findMany({ where: { AND: [activityVisibilityWhere(access.profile.role) ?? {}, { id: { in: [...ids] } }] }, select: { id: true } });
      if (visible.length !== ids.length) throw appError("FORBIDDEN");
      const readAt = new Date();
      for (const id of ids) await tx.adminNotificationReceipt.upsert({ where: { profileId_auditLogId: { profileId: access.profile.id, auditLogId: id } }, create: { profileId: access.profile.id, auditLogId: id, readAt }, update: { readAt } });
    });
  }
}
