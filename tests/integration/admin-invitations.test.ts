import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { verifyPassword } from "better-auth/crypto";
import { getPrismaClient } from "@/lib/db/prisma";
import type { AdminAccess } from "@/lib/auth/admin";
import { requireAdminForSession } from "@/lib/auth/admin";
import { PrismaAdminProfileRepository } from "@/modules/admin/repository";
import { PrismaAdminInvitationRepository } from "@/modules/admin-auth/invitation-repository";
import { AdminInvitationService, invitationTokenHash } from "@/modules/admin-auth/invitation-service";
import type { AdminAuthMail } from "@/modules/admin-auth/mail";

const prisma = getPrismaClient();
const password = "Test-748!";
let access: AdminAccess;
let email: string;
let messages: AdminAuthMail[];
let ready: boolean;
let failMail: boolean;
let service: AdminInvitationService;
let clock: Date;
function token(): string { return new URLSearchParams(new URL(messages.at(-1)!.url).hash.slice(1)).get("token")!; }
const input = () => ({ displayName: "Invited Admin Fixture", email });

beforeEach(async () => {
  const userId = randomUUID();
  const user = await prisma.adminAuthUser.create({ data: { id: userId, email: `inviter-${userId}@example.test`, name: "Invitation Owner Fixture", emailVerified: true, profile: { create: { role: "OWNER", isActive: true } } }, include: { profile: true } });
  access = { authUserId: userId, profile: user.profile! };
  email = `invited-${randomUUID()}@example.test`;
  messages = []; ready = true; failMail = false; clock = new Date();
  service = new AdminInvitationService(new PrismaAdminInvitationRepository(prisma), { ready: () => ready, baseUrl: "http://localhost:3997", send: async message => { if (failMail) throw new Error("SMTP fixture unavailable"); messages.push(message); } }, () => clock);
});

describe("Owner-only Admin invitations against PostgreSQL", () => {
  it("activates exactly one Admin with their password, verified email and no MFA/session bypass", async () => {
    await service.invite(access, input());
    const invitationToken = token();
    expect(new URL(messages[0].url).searchParams.has("token")).toBe(false);
    expect(await prisma.adminAuthUser.findUnique({ where: { email } })).toBeNull();
    const results = await Promise.allSettled([service.accept({ token: invitationToken, password }), service.accept({ token: invitationToken, password })]);
    expect(results.filter(value => value.status === "fulfilled")).toHaveLength(1);
    const user = await prisma.adminAuthUser.findUniqueOrThrow({ where: { email }, include: { profile: true, accounts: true, sessions: true } });
    expect(user).toMatchObject({ emailVerified: true, twoFactorEnabled: false, profile: { role: "ADMIN", isActive: true }, sessions: [] });
    expect(await verifyPassword({ hash: user.accounts[0].password!, password })).toBe(true);
    await expect(requireAdminForSession({ userId: user.id, mfaVerified: false, twoFactorEnabled: false }, new PrismaAdminProfileRepository(prisma))).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(service.accept({ token: invitationToken, password })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await prisma.adminInvitation.findUnique({ where: { email } })).toMatchObject({ status: "ACCEPTED", tokenHash: null });
  });
  it("rejects ordinary Admin, inactive Owner and injected Owner role before sending", async () => {
    await expect(service.invite({ ...access, profile: { ...access.profile, role: "ADMIN" } }, input())).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.invite(access, { ...input(), role: "OWNER" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await prisma.adminProfile.update({ where: { id: access.profile.id }, data: { isActive: false } });
    await expect(service.invite(access, input())).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(messages).toEqual([]);
    expect(await prisma.adminInvitation.findUnique({ where: { email } })).toBeNull();
  });
  it("does not save an invitation without SMTP and lets a failed delivery be retried", async () => {
    ready = false;
    await expect(service.invite(access, input())).rejects.toMatchObject({ code: "AUTH_UNAVAILABLE" });
    expect(await prisma.adminInvitation.findUnique({ where: { email } })).toBeNull();
    ready = true; failMail = true;
    await expect(service.invite(access, input())).rejects.toMatchObject({ code: "AUTH_UNAVAILABLE" });
    expect(await prisma.adminInvitation.findUnique({ where: { email } })).toMatchObject({ status: "FAILED", tokenHash: null });
    failMail = false;
    await service.invite(access, input());
    expect(await prisma.adminInvitation.findUnique({ where: { email } })).toMatchObject({ status: "SENT" });
  });
  it("blocks duplicate active invitations and rotates expired tokens", async () => {
    await service.invite(access, input());
    const oldToken = token();
    await expect(service.invite(access, input())).rejects.toMatchObject({ code: "CONFLICT" });
    clock = new Date(clock.getTime() + 30 * 60_000);
    await expect(service.accept({ token: oldToken, password })).rejects.toMatchObject({ code: "CONFLICT" });
    await service.invite(access, input());
    expect(token()).not.toBe(oldToken);
    expect(await prisma.adminInvitation.findUnique({ where: { tokenHash: invitationTokenHash(oldToken) } })).toBeNull();
    await expect(service.accept({ token: oldToken, password })).rejects.toMatchObject({ code: "CONFLICT" });
    await service.accept({ token: token(), password });
  });
  it("does not overwrite an existing identity, including a differently cased email", async () => {
    const user = await prisma.adminAuthUser.create({ data: { id: randomUUID(), email: email.toUpperCase(), name: "Existing fixture" } });
    await expect(service.invite(access, input())).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await prisma.adminAuthUser.findUnique({ where: { id: user.id } })).toMatchObject({ name: "Existing fixture", emailVerified: false });
    expect(messages).toEqual([]);
  });
  it("rejects activation when the inviting Owner is deactivated or demoted", async () => {
    await service.invite(access, input());
    await prisma.adminProfile.update({ where: { id: access.profile.id }, data: { role: "ADMIN" } });
    await expect(service.accept({ token: token(), password })).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await prisma.adminAuthUser.findUnique({ where: { email } })).toBeNull();
  });
  it("rejects malformed tokens and short passwords", async () => {
    await service.invite(access, input());
    await expect(service.accept({ token: token(), password: "short" })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(service.accept({ token: token(), password: "a".repeat(16) })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(service.accept({ token: "guess", password })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(await prisma.adminAuthUser.findUnique({ where: { email } })).toBeNull();
  });
});
