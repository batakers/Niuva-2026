import { randomUUID } from "node:crypto";
import type { AdminInvitation, AdminProfile, Prisma, PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";

export type InvitationData = Pick<AdminInvitation, "email" | "displayName" | "tokenHash" | "invitedByAdminId" | "expiresAt">;
export interface AdminInvitationStore {
  findByEmail(email: string): Promise<AdminInvitation | null>;
  findByToken(tokenHash: string): Promise<AdminInvitation | null>;
  findOwner(id: string): Promise<Pick<AdminProfile, "isActive" | "role"> | null>;
  hasAccount(email: string): Promise<boolean>;
  saveInvitation(data: InvitationData): Promise<void>;
  activateAdmin(invitation: AdminInvitation, passwordHash: string, now: Date): Promise<void>;
}
export interface AdminInvitationRepository {
  findByToken(tokenHash: string): Promise<AdminInvitation | null>;
  withEmailLock<T>(email: string, work: (store: AdminInvitationStore) => Promise<T>): Promise<T>;
  markDelivery(tokenHash: string, status: "SENT" | "FAILED"): Promise<void>;
}
function store(tx: Prisma.TransactionClient): AdminInvitationStore {
  return {
    findByEmail: email => tx.adminInvitation.findUnique({ where: { email } }),
    findByToken: tokenHash => tx.adminInvitation.findUnique({ where: { tokenHash } }),
    async findOwner(id) {
      // Keep Owner revocation ordered with creation/acceptance in this transaction.
      await tx.$queryRaw`SELECT id FROM admin_profiles WHERE id = ${id}::uuid FOR SHARE`;
      return tx.adminProfile.findUnique({ where: { id }, select: { role: true, isActive: true } });
    },
    async hasAccount(email) { return Boolean(await tx.adminAuthUser.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } })); },
    async saveInvitation(data) {
      const invitation = await tx.adminInvitation.upsert({ where: { email: data.email }, create: data, update: { ...data, status: "PENDING", acceptedAt: null } });
      await tx.auditLog.create({ data: { actorType: "ADMIN", actorId: data.invitedByAdminId, entityType: "AdminInvitation", entityId: invitation.id, action: "admin.invitation.created", afterJson: { status: "PENDING" } } });
    },
    async activateAdmin(invitation, passwordHash, now) {
      const id = randomUUID();
      await tx.adminAuthUser.create({ data: {
        id, email: invitation.email, name: invitation.displayName, emailVerified: true,
        accounts: { create: { id: randomUUID(), accountId: id, providerId: "credential", password: passwordHash } },
        profile: { create: { displayName: invitation.displayName, role: "ADMIN", isActive: true } },
      } });
      await tx.adminInvitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED", acceptedAt: now, tokenHash: null } });
      await tx.auditLog.create({ data: { actorType: "SYSTEM", entityType: "AdminInvitation", entityId: invitation.id, action: "admin.invitation.accepted", afterJson: { status: "ACCEPTED" } } });
    },
  };
}
export class PrismaAdminInvitationRepository implements AdminInvitationRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}
  findByToken(tokenHash: string) { return this.prisma.adminInvitation.findUnique({ where: { tokenHash } }); }
  withEmailLock<T>(email: string, work: (store: AdminInvitationStore) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`admin-invitation:${email}`}, 0))::text`;
      return work(store(tx));
    });
  }
  async markDelivery(tokenHash: string, status: "SENT" | "FAILED") {
    await this.prisma.$transaction(async tx => {
      const invitation = await tx.adminInvitation.findUnique({ where: { tokenHash }, select: { id: true, invitedByAdminId: true, status: true } });
      if (invitation?.status !== "PENDING") return;
      const updated = await tx.adminInvitation.updateMany({ where: { id: invitation.id, tokenHash, status: "PENDING" }, data: { status, ...(status === "FAILED" ? { tokenHash: null } : {}) } });
      if (updated.count === 1) await tx.auditLog.create({ data: { actorType: "SYSTEM", entityType: "AdminInvitation", entityId: invitation.id, action: status === "SENT" ? "admin.invitation.sent" : "admin.invitation.failed", afterJson: { status } } });
    });
  }
}
