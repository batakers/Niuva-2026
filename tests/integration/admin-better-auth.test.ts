import { randomUUID, createHmac } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { hashPassword } from "better-auth/crypto";
import { getPrismaClient } from "@/lib/db/prisma";
import { createAdminAuthEngine } from "@/lib/auth/admin-engine";
import { requireAdminForSession } from "@/lib/auth/admin";
import { PrismaAdminProfileRepository } from "@/modules/admin/repository";
import { handleAdminAuthRequest } from "@/modules/admin-auth/handler";
import { provisionAdminIdentity } from "@/modules/admin-auth/provision";

const prisma = getPrismaClient();
const origin = "http://localhost:3997";
const password = "Test-472!";
const profiles = new PrismaAdminProfileRepository(prisma);
const mails: { url: string; kind: string }[] = [];
const engine = createAdminAuthEngine(prisma, { baseUrl: origin, production: false, secret: "integration-only-admin-secret-never-use-in-production", sendMail: async mail => { mails.push(mail); } });
const cookies = new Map<string, string>();
let email = "";
let userId = "";

function cookieHeaders() { return { origin, "Content-Type": "application/json", cookie: [...cookies.entries()].map(([key, value]) => `${key}=${value}`).join("; "), "x-forwarded-for": "127.0.0.1" }; }
async function call(path: string, body?: unknown) {
  const response = await handleAdminAuthRequest(new Request(origin + "/api/admin/auth" + path, { method: body === undefined ? "GET" : "POST", headers: cookieHeaders(), ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), engine, { profiles, mailReady: () => true });
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(";"); const index = pair.indexOf("="); const key = pair.slice(0, index); const value = pair.slice(index + 1);
    if (!value) cookies.delete(key); else cookies.set(key, value);
  }
  return response;
}
async function authorized() {
  const session = await engine.api.getSession({ headers: new Headers(cookieHeaders()) });
  return requireAdminForSession({ userId: session?.user.id ?? null, mfaVerified: session?.session.mfaVerified ?? false, twoFactorEnabled: session?.user.twoFactorEnabled ?? false }, profiles);
}
// Independent RFC 6238 test generator; production uses Better Auth's TOTP engine.
function totp(uri: string): string {
  const secret = new URL(uri).searchParams.get("secret")!;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bits = [...secret.toUpperCase()].map(char => alphabet.indexOf(char).toString(2).padStart(5, "0")).join("");
  const key = Buffer.from(bits.match(/.{8}/g)!.map(value => parseInt(value, 2)));
  const counter = Buffer.alloc(8); counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 30000)));
  const digest = createHmac("sha1", key).update(counter).digest(); const offset = digest[digest.length - 1] & 15;
  return String((digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}
async function enroll() {
  expect((await call("/sign-in/email", { email, password })).status).toBe(200);
  const setup = await (await call("/two-factor/enable", { password })).json() as { totpURI: string; backupCodes: string[] };
  expect((await call("/two-factor/verify-totp", { code: totp(setup.totpURI), trustDevice: false })).status).toBe(200);
  return setup;
}

beforeEach(async () => {
  cookies.clear(); mails.length = 0;
  await prisma.adminAuthRateLimit.deleteMany();
  userId = randomUUID(); email = `admin-${userId}@example.test`;
  await prisma.adminAuthUser.create({ data: { id: userId, name: "Test Owner", email, emailVerified: true, accounts: { create: { id: randomUUID(), accountId: userId, providerId: "credential", password: await hashPassword(password) } }, profile: { create: { role: "OWNER", isActive: true, clerkUserId: `legacy-${userId}` } } } });
});

describe("Better Auth Admin PostgreSQL boundary", () => {
  it("allows a provisioned Owner to verify email and enroll TOTP with the original password", async () => {
    const legacy = await prisma.adminProfile.create({ data: { clerkUserId: `legacy-provision-${randomUUID()}`, displayName: "Provisioned Owner Fixture", role: "OWNER", isActive: true } });
    email = `provisioned-owner-${randomUUID()}@example.test`;
    const result = await provisionAdminIdentity(prisma, { email, password, profileId: legacy.id, displayName: legacy.displayName!, role: "OWNER", confirmation: "I_UNDERSTAND_NON_PRODUCTION" });
    const user = await prisma.adminAuthUser.findUniqueOrThrow({ where: { email }, select: { id: true, emailVerified: true, accounts: { select: { providerId: true, accountId: true, userId: true } } } });
    userId = user.id;
    expect(result.profileId).toBe(legacy.id);
    expect(user.emailVerified).toBe(false);
    expect(user.accounts).toEqual([{ providerId: "credential", accountId: user.id, userId: user.id }]);
    const login = await call("/sign-in/email", { email, password });
    expect(login.status).toBe(403);
    expect(await login.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });
    await expect(authorized()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const mail = mails.find(value => value.kind === "verify")!;
    expect(mail).toBeDefined();
    const link = new URL(mail.url);
    expect((await call(link.pathname.slice("/api/admin/auth".length) + link.search)).status).toBe(302);
    await enroll();
    expect((await authorized()).profile.id).toBe(legacy.id);
    expect(await prisma.adminProfile.findUniqueOrThrow({ where: { id: legacy.id } })).toMatchObject({ clerkUserId: legacy.clerkUserId, createdAt: legacy.createdAt, role: "OWNER", isActive: true });
  });

  it.each([7, 16])("enforces new-password policy inside the engine at length %i", async length => {
    await expect(engine.api.resetPassword({ body: { token: "synthetic-invalid-token", newPassword: "a".repeat(length) } })).rejects.toMatchObject({ body: { code: "INVALID_PASSWORD_LENGTH" } });
  });
  it("requires email verification before enrollment and returns to the native Admin login", async () => {
    await prisma.adminAuthUser.update({ where: { id: userId }, data: { emailVerified: false } });
    expect((await call("/sign-in/email", { email, password })).status).toBe(403);
    await expect(authorized()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const mail = mails.find(value => value.kind === "verify")!;
    const link = new URL(mail.url);
    expect(link.searchParams.get("callbackURL")).toBe(origin + "/admin/sign-in?verified=1");
    const verified = await call(link.pathname.slice("/api/admin/auth".length) + link.search);
    expect(verified.status).toBe(302);
    expect(verified.headers.get("location")).toBe(origin + "/admin/sign-in?verified=1");
    expect(verified.headers.get("cache-control")).toBe("no-store");
    expect((await prisma.adminAuthUser.findUniqueOrThrow({ where: { id: userId } })).emailVerified).toBe(true);
    await expect(authorized()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await enroll();
    expect((await authorized()).profile.role).toBe("OWNER");
  });
  it("serializes legacy-profile mapping so two identities cannot claim the same business history", async () => {
    const legacy = await prisma.adminProfile.create({ data: { clerkUserId: `legacy-map-${randomUUID()}`, displayName: "Legacy Operator", isActive: true, role: "ADMIN" } });
    const firstEmail = `map-a-${randomUUID()}@example.test`, secondEmail = `map-b-${randomUUID()}@example.test`;
    let results: Promise<PromiseSettledResult<Awaited<ReturnType<typeof provisionAdminIdentity>>>[]> | undefined;
    await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT "id" FROM "admin_profiles" WHERE "id" = ${legacy.id}::uuid FOR UPDATE`;
      const input = { profileId: legacy.id, displayName: "Legacy Operator", role: "ADMIN" as const, confirmation: "I_UNDERSTAND_NON_PRODUCTION" as const, password };
      results = Promise.allSettled([provisionAdminIdentity(prisma, { ...input, email: firstEmail }), provisionAdminIdentity(prisma, { ...input, email: secondEmail })]);
      await expect.poll(async () => {
        const [row] = await prisma.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock' AND query LIKE '%admin_profiles%'`;
        return Number(row.count);
      }, { timeout: 4000 }).toBe(2);
    }, { timeout: 5000 });
    const outcomes = await results!;
    expect(outcomes.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(outcomes.filter(result => result.status === "rejected")).toHaveLength(1);
    const mapped = await prisma.adminProfile.findUniqueOrThrow({ where: { id: legacy.id } });
    expect(mapped).toMatchObject({ clerkUserId: legacy.clerkUserId, createdAt: legacy.createdAt, role: "ADMIN", isActive: true });
    expect(await prisma.adminAuthUser.count({ where: { email: { in: [firstEmail, secondEmail] } } })).toBe(1);
    expect((await prisma.adminAuthUser.findUniqueOrThrow({ where: { id: mapped.authUserId! } })).emailVerified).toBe(false);
  });
  it("requires verified enrollment and a fresh second factor on every login while preserving the business profile", async () => {
    const original = await prisma.adminProfile.findUniqueOrThrow({ where: { authUserId: userId } });
    expect((await call("/sign-in/email", { email, password })).status).toBe(200);
    await expect(authorized()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const setup = await (await call("/two-factor/enable", { password })).json() as { totpURI: string; backupCodes: string[] };
    await expect(authorized()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const stored = await prisma.adminAuthTwoFactor.findFirstOrThrow({ where: { userId } });
    expect(stored.secret).not.toBe(new URL(setup.totpURI).searchParams.get("secret"));
    expect(stored.backupCodes).not.toContain(setup.backupCodes[0]);
    expect((await call("/two-factor/verify-totp", { code: totp(setup.totpURI), trustDevice: false })).status).toBe(200);
    expect((await authorized()).profile.id).toBe(original.id);
    await call("/sign-out", {}); await expect(authorized()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const login = await (await call("/sign-in/email", { email, password })).json() as { twoFactorRedirect: boolean };
    expect(login.twoFactorRedirect).toBe(true); await expect(authorized()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect((await call("/two-factor/verify-totp", { code: "000000", trustDevice: false })).status).toBeGreaterThanOrEqual(400);
    expect((await call("/two-factor/verify-totp", { code: totp(setup.totpURI), trustDevice: false })).status).toBe(200);
    expect((await authorized()).profile.id).toBe(original.id);
    await prisma.adminProfile.update({ where: { id: original.id }, data: { isActive: false } });
    await expect(authorized()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("consumes a recovery code once and never exposes signup, MFA removal, or trusted-device bypass", async () => {
    const setup = await enroll(); await call("/sign-out", {}); await call("/sign-in/email", { email, password });
    expect((await call("/two-factor/verify-backup-code", { code: setup.backupCodes[0], trustDevice: false })).status).toBe(200);
    expect((await authorized()).profile.role).toBe("OWNER");
    expect((await call("/two-factor/disable", { password })).status).toBe(404);
    expect((await call("/sign-up/email", { name: "Intruder", email: "intruder@example.test", password })).status).toBe(404);
    await call("/sign-out", {}); await call("/sign-in/email", { email, password });
    expect((await call("/two-factor/verify-totp", { code: totp(setup.totpURI), trustDevice: true })).status).toBe(400);
    expect((await call("/two-factor/verify-backup-code", { code: setup.backupCodes[0], trustDevice: false })).status).toBeGreaterThanOrEqual(400);
    await expect(authorized()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("revokes existing sessions on password reset without removing MFA", async () => {
    await enroll(); const sessionCookies = new Map(cookies);
    expect((await call("/request-password-reset", { email })).status).toBe(200);
    const resetMail = mails.find(mail => mail.kind === "reset")!;
    const link = new URL(resetMail.url);
    const resetToken = link.pathname.split("/").at(-1)!;
    const redirected = await call(link.pathname.slice("/api/admin/auth".length) + link.search);
    expect(redirected.status).toBe(302);
    const landing = new URL(redirected.headers.get("location")!);
    expect(landing.origin + landing.pathname).toBe(origin + "/admin/sign-in");
    expect(landing.searchParams.get("flow")).toBe("reset");
    expect(landing.searchParams.get("token")).toBe(resetToken);
    expect((await call("/reset-password", { token: resetToken, newPassword: "New-Test-598!" })).status).toBe(200);
    cookies.clear(); sessionCookies.forEach((value, key) => cookies.set(key, value));
    await expect(authorized()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect((await prisma.adminAuthUser.findUniqueOrThrow({ where: { id: userId } })).twoFactorEnabled).toBe(true);
    expect((await call("/reset-password", { token: resetToken, newPassword: password })).status).toBeGreaterThanOrEqual(400);
  });

  it("requires fresh MFA after a password change and invalidates the previous session", async () => {
    const setup = await enroll();
    const oldCookies = new Map(cookies);
    const newPassword = "Changed-692!";
    expect((await call("/change-password", { currentPassword: password, newPassword })).status).toBe(200);
    await expect(authorized()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    cookies.clear(); oldCookies.forEach((value, key) => cookies.set(key, value));
    await expect(authorized()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    cookies.clear();
    expect((await call("/sign-in/email", { email, password: newPassword })).status).toBe(200);
    await expect(authorized()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect((await call("/two-factor/verify-totp", { code: totp(setup.totpURI), trustDevice: false })).status).toBe(200);
    expect((await authorized()).profile.role).toBe("OWNER");
  });

  it("rejects cross-origin login, unknown profile sessions and a Customer-only identity", async () => {
    const response = await handleAdminAuthRequest(new Request(origin + "/api/admin/auth/sign-in/email", { method: "POST", headers: { "Content-Type": "application/json", origin: "https://foreign.example" }, body: JSON.stringify({ email, password }) }), engine, { profiles, mailReady: () => true });
    expect(response.status).toBe(403);
    await prisma.adminProfile.update({ where: { authUserId: userId }, data: { isActive: false } });
    expect((await call("/sign-in/email", { email, password })).status).toBeGreaterThanOrEqual(400);
    await prisma.customer.upsert({ where: { normalizedEmail: "customer-admin-boundary@example.test" }, create: { email: "customer-admin-boundary@example.test", normalizedEmail: "customer-admin-boundary@example.test", displayName: "Customer", emailVerifiedAt: new Date() }, update: {} });
    expect((await call("/sign-in/email", { email: "customer-admin-boundary@example.test", password })).status).toBeGreaterThanOrEqual(400);
    expect(await prisma.adminAuthUser.findUnique({ where: { email: "customer-admin-boundary@example.test" } })).toBeNull();
  });
});
