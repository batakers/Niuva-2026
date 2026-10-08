import type { AdminRole, Prisma, PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";

export type ManagedAdminAccount = Readonly<{
  id: string;
  displayName: string;
  email: string | null;
  role: AdminRole;
  isActive: boolean;
  mfaEnabled: boolean;
  createdAt: Date;
}>;

export type ManagedAdminInvitation = Readonly<{
  id: string;
  displayName: string;
  email: string;
  status: "PENDING" | "SENT" | "FAILED";
  expiresAt: Date;
  createdAt: Date;
}>;

export type ManagedAdminList = Readonly<{
  accounts: readonly ManagedAdminAccount[];
  invitations: readonly ManagedAdminInvitation[];
}>;

export type ManagedAdminTarget = Readonly<{
  id: string;
  role: AdminRole;
  isActive: boolean;
  authUserId: string | null;
}>;

export interface AdminAccessManagementStore {
  findOwner(id: string): Promise<Pick<ManagedAdminTarget, "role" | "isActive"> | null>;
  findTarget(id: string): Promise<ManagedAdminTarget | null>;
  disable(target: ManagedAdminTarget, actorId: string): Promise<boolean>;
}

export interface AdminAccessManagementRepository {
  isActiveOwner(id: string): Promise<boolean>;
  list(): Promise<ManagedAdminList>;
  withLockedProfiles<T>(actorId: string, targetId: string, work: (store: AdminAccessManagementStore) => Promise<T>): Promise<T>;
}

function transactionStore(tx: Prisma.TransactionClient): AdminAccessManagementStore {
  return {
    findOwner: (id) => tx.adminProfile.findUnique({ where: { id }, select: { role: true, isActive: true } }),
    findTarget: (id) => tx.adminProfile.findUnique({ where: { id }, select: { id: true, role: true, isActive: true, authUserId: true } }),
    async disable(target, actorId) {
      const changed = await tx.adminProfile.updateMany({ where: { id: target.id, role: "ADMIN", isActive: true }, data: { isActive: false } });
      if (changed.count !== 1) return false;
      if (target.authUserId !== null) await tx.adminAuthSession.deleteMany({ where: { userId: target.authUserId } });
      await tx.auditLog.create({ data: {
        actorType: "ADMIN",
        actorId,
        entityType: "AdminProfile",
        entityId: target.id,
        action: "admin.deactivated",
        beforeJson: { isActive: true },
        afterJson: { isActive: false },
      } });
      return true;
    },
  };
}

export class PrismaAdminAccessManagementRepository implements AdminAccessManagementRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async isActiveOwner(id: string): Promise<boolean> {
    return Boolean(await this.prisma.adminProfile.findFirst({ where: { id, role: "OWNER", isActive: true }, select: { id: true } }));
  }

  async list(): Promise<ManagedAdminList> {
    const [accounts, invitations] = await Promise.all([
      this.prisma.adminProfile.findMany({
        orderBy: [{ role: "asc" }, { isActive: "desc" }, { createdAt: "asc" }],
        select: { id: true, displayName: true, role: true, isActive: true, createdAt: true, authUser: { select: { name: true, email: true, twoFactorEnabled: true } } },
      }),
      this.prisma.adminInvitation.findMany({
        where: { status: { in: ["PENDING", "SENT", "FAILED"] } },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 50,
        select: { id: true, displayName: true, email: true, status: true, expiresAt: true, createdAt: true },
      }),
    ]);
    return {
      accounts: accounts.map((account) => ({
        id: account.id,
        displayName: account.displayName ?? account.authUser?.name ?? "Admin tanpa nama",
        email: account.authUser?.email ?? null,
        role: account.role,
        isActive: account.isActive,
        mfaEnabled: account.authUser?.twoFactorEnabled ?? false,
        createdAt: account.createdAt,
      })),
      invitations: invitations.map((invitation) => ({ ...invitation, status: invitation.status as ManagedAdminInvitation["status"] })),
    };
  }

  withLockedProfiles<T>(actorId: string, targetId: string, work: (store: AdminAccessManagementStore) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM admin_profiles WHERE id = ${actorId}::uuid FOR SHARE`;
      await tx.$queryRaw`SELECT id FROM admin_profiles WHERE id = ${targetId}::uuid FOR UPDATE`;
      return work(transactionStore(tx));
    });
  }
}
