import { beforeEach, describe, expect, it } from "vitest";
import { Prisma } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { CustomerEmailRepository } from "@/modules/customer-auth/email-repository";
import { CustomerEmailService } from "@/modules/customer-auth/email-service";
import { CustomerAuthRepository } from "@/modules/customer-auth/repository";
import { hashOpaqueToken } from "@/modules/customer-auth/core";
import { AGE_DECLARATION_VERSION } from "@/modules/customer-auth/age-declaration";
const prisma = getPrismaClient();
const repo = new CustomerEmailRepository(prisma);
const legal = { terms: { href: "/TEST-ONLY-terms", version: "TEST-TERMS-1" }, privacy: { href: "/TEST-ONLY-privacy", version: "TEST-PRIVACY-1" } };
const password = "a sufficiently long passphrase";
let now: Date;
let mails: { token: string; purpose: "verify" | "reset"; to: string }[];
let service: CustomerEmailService;
const data = (email = "email-auth@example.test") => ({ name: "Test Customer", email, password, confirmPassword: password, consent: "on", ageDeclaration: "on", returnTo: "/checkout?test=1#summary" });
async function verified() {
  const registration = await service.register(data(), "test-ip");
  const token = mails.at(-1)!.token;
  await service.verify(token, "test-ip");
  return { registration, token };
}
beforeEach(async () => {
  await prisma.customerAuthRateLimit.deleteMany();
  await prisma.customerPendingRegistration.deleteMany();
  await prisma.order.deleteMany({ where: { customerEmail: "email-auth@example.test" } });
  await prisma.customer.deleteMany({ where: { normalizedEmail: { endsWith: "@example.test" } } });
  now = new Date("2026-10-01T12:00:00Z");
  mails = [];
  service = new CustomerEmailService(repo, { async send(mail) { mails.push(mail); } }, legal, () => now);
});
describe("Customer email auth PostgreSQL", () => {
  it("keeps registration pending without session/order ownership, then creates credential and consent atomically", async () => {
    const order = await prisma.order.create({ data: {
      customerEmail: data().email, customerName: "Test Customer", customerPhone: "+6281234567890",
      grandTotalRp: new Prisma.Decimal("100000"), itemsSubtotalRp: new Prisma.Decimal("90000"), shippingTotalRp: new Prisma.Decimal("10000"),
      orderNumber: `ORD-EMAIL-${crypto.randomUUID()}`, orderType: "RETAIL", publicTokenHash: crypto.randomUUID(),
    } });
    const registration = await service.register({ ...data(), ageDeclarationVersion: "CLIENT-FORGED", ageDeclaredAt: "2099-01-01T00:00:00Z" }, "ip");
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.customerId).toBeNull();
    expect(await prisma.customer.findUnique({ where: { normalizedEmail: data().email } })).toBeNull();
    const pending = await repo.findPending(registration.handle!, now);
    expect(pending?.passwordHash).not.toContain(password);
    expect(pending?.deliveryConfirmed).toBe(true);
    expect(pending?.ageDeclarationVersion).toBe(AGE_DECLARATION_VERSION);
    expect(pending?.ageDeclaredAt).toEqual(now);
    expect(await repo.findToken(mails[0].token, "verify", now)).not.toBeNull();
    await service.verify(mails[0].token, "ip");
    const customer = await prisma.customer.findUnique({ where: { normalizedEmail: data().email }, include: { passwordCredential: true, consents: true, sessions: true } });
    expect(customer?.googleSubject).toBeNull();
    expect(customer?.emailVerifiedAt).toEqual(now);
    expect(customer?.passwordCredential).not.toBeNull();
    expect(customer?.consents[0].termsVersion).toBe(legal.terms.version);
    expect(customer?.consents[0].ageDeclarationVersion).toBe(AGE_DECLARATION_VERSION);
    expect(customer?.consents[0].ageDeclaredAt).toEqual(pending?.ageDeclaredAt);
    expect(customer?.sessions).toEqual([]);
    expect((await prisma.order.findUnique({ where: { id: order.id } }))?.customerId).toBe(customer?.id);
    await expect(service.verify(mails[0].token, "ip")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("serializes concurrent verification so only one consumption succeeds", async () => {
    await service.register(data(), "ip");
    const results = await Promise.allSettled([service.verify(mails[0].token, "ip"), service.verify(mails[0].token, "ip")]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(await prisma.customer.count({ where: { normalizedEmail: data().email } })).toBe(1);
  });
  it("rejects missing consent and mismatched password before creating a registration", async () => {
    await expect(service.register({ ...data(), consent: undefined }, "ip")).rejects.toThrow();
    await expect(service.register({ ...data(), confirmPassword: "different" }, "ip")).rejects.toThrow();
    expect(await prisma.customerPendingRegistration.count()).toBe(0);
  });
  it("gates registration without legal documents or mail service", async () => {
    await expect(new CustomerEmailService(repo, service.mailer, null).register(data(), "ip")).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    await expect(new CustomerEmailService(repo, null, legal).register(data(), "ip")).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
  });
  it.each([undefined, "off", "false", true, false])("refuses invalid age declaration %j before persistence or email", async ageDeclaration => {
    await expect(service.register({ ...data(), ageDeclaration }, "ip")).rejects.toThrow();
    expect(await prisma.customerPendingRegistration.count()).toBe(0);
    expect(await prisma.customerEmailToken.count()).toBe(0);
    expect(mails).toHaveLength(0);
  });
  it.each([
    { ageDeclarationVersion: null, ageDeclaredAt: null },
    { ageDeclarationVersion: "OLD", ageDeclaredAt: new Date("2026-10-01T12:00:00Z") },
    { ageDeclarationVersion: AGE_DECLARATION_VERSION, ageDeclaredAt: new Date("2026-10-01T12:00:01Z") },
  ])("refuses legacy or invalid pending age proof without creating credentials or claiming the token", async proof => {
    await service.register(data(), "ip");
    const pending = await prisma.customerPendingRegistration.findFirstOrThrow();
    await prisma.customerPendingRegistration.update({ where: { id: pending.id }, data: proof });
    await expect(service.verify(mails[0].token, "ip")).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    expect(await prisma.customer.count({ where: { normalizedEmail: data().email } })).toBe(0);
    expect(await prisma.customerPasswordCredential.count()).toBe(0);
    expect((await prisma.customerEmailToken.findUniqueOrThrow({ where: { tokenHash: hashOpaqueToken(mails[0].token) } })).consumedAt).toBeNull();
    expect((await prisma.customerPendingRegistration.findUniqueOrThrow({ where: { id: pending.id } })).completedAt).toBeNull();
  });
  it("rejects direct ordinary Google creation even if allowCreate is supplied", async () => {
    await expect(new CustomerAuthRepository(prisma).upsertGoogleCustomer({ email: "new@example.test", normalizedEmail: "new@example.test", googleSubject: "new-sub" }, now, true)).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    expect(await prisma.customer.count({ where: { normalizedEmail: "new@example.test" } })).toBe(0);
  });
  it("creates 24-hour and 30-day server sessions and refuses an incorrect password", async () => {
    await verified();
    const short = await service.login({ email: data().email, password, returnTo: "https://evil.test" }, "ip");
    expect(short.returnTo).toBe("/account");
    expect(short.remember).toBe(false);
    const long = await service.login({ email: data().email, password, remember: "on" }, "ip");
    expect(long.remember).toBe(true);
    const sessions = await prisma.customerSession.findMany({ where: { tokenHash: { in: [hashOpaqueToken(short.token), hashOpaqueToken(long.token)] } }, orderBy: { expiresAt: "asc" } });
    expect(sessions.map(session => session.expiresAt.getTime() - now.getTime())).toEqual([86400000, 2592000000]);
    await expect(service.login({ email: data().email, password: "wrong" }, "ip")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("resends after cooldown, invalidates old token, and rejects expired tokens", async () => {
    const registration = await service.register(data(), "ip");
    const first = mails[0].token;
    await expect(service.resend(registration.handle!, "/account", "ip")).rejects.toMatchObject({ code: "RATE_LIMITED" });
    now = new Date(now.getTime() + 61000);
    await service.resend(registration.handle!, "/account", "ip");
    await expect(service.verify(first, "ip")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    now = new Date(now.getTime() + 86400001);
    await expect(service.verify(mails[1].token, "ip")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("records delivery failure without claiming sent or exposing a valid token", async () => {
    const broken = new CustomerEmailService(repo, { async send() { throw new Error("provider failure"); } }, legal, () => now);
    const registration = await broken.register(data(), "ip");
    expect(registration.sent).toBe(false);
    expect(registration.handle).toBeTruthy();
    expect((await repo.findPending(registration.handle!, now))?.deliveryConfirmed).toBe(false);
    expect(await prisma.customerEmailToken.count({ where: { consumedAt: null } })).toBe(0);
  });
  it("reset changes password, revokes every session, and consumes token only once", async () => {
    await verified();
    const oldSession = await service.login({ email: data().email, password }, "ip");
    await service.forgot(data().email, "/checkout", "ip");
    const reset = mails.at(-1)!;
    expect(reset.purpose).toBe("reset");
    const nextPassword = "another sufficiently long phrase";
    expect(await service.reset(reset.token, nextPassword, nextPassword, "ip")).toBe("/checkout");
    expect((await prisma.customerSession.findUnique({ where: { tokenHash: hashOpaqueToken(oldSession.token) } }))?.revokedAt).toEqual(now);
    await expect(service.login({ email: data().email, password }, "ip")).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(service.login({ email: data().email, password: nextPassword }, "ip")).resolves.toHaveProperty("token");
    await expect(service.reset(reset.token, nextPassword, nextPassword, "ip")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("reset rejects expired tokens and never sets passwords on Google accounts", async () => {
    await verified();
    await service.forgot(data().email, "/account", "ip");
    const token = mails.at(-1)!.token;
    now = new Date(now.getTime() + 1800001);
    await expect(service.reset(token, password, password, "ip")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const google = await prisma.customer.create({ data: { email: "google@example.test", normalizedEmail: "google@example.test", googleSubject: "test-google", emailVerifiedAt: now } });
    const mailCount = mails.length;
    await service.forgot(google.email, "/account", "ip");
    await service.forgot("missing@example.test", "/account", "ip");
    expect(mails.length).toBe(mailCount);
  }, 10000);
  it("does not overwrite existing credentials or merge a verified Google identity into a password account", async () => {
    await verified();
    const existing = await repo.findCredential(data().email);
    const repeated = await service.register({ ...data(), password: "other long password phrase", confirmPassword: "other long password phrase" }, "ip");
    expect(repeated.handle).toBeNull();
    expect((await repo.findCredential(data().email))?.passwordCredential?.passwordHash).toBe(existing?.passwordCredential?.passwordHash);
    await expect(new CustomerAuthRepository(prisma).upsertGoogleCustomer({ email: data().email, normalizedEmail: data().email, googleSubject: "different-google" }, now)).rejects.toMatchObject({ code: "CONFLICT" });
  });
  it("persists rate limits across repository instances and resets expired windows", async () => {
    for (let i = 0; i < 5; i++) await service.throttle("login", "limited@example.test", "ip");
    const another = new CustomerEmailService(new CustomerEmailRepository(prisma), service.mailer, legal, () => now);
    await expect(another.throttle("login", "limited@example.test", "ip")).rejects.toMatchObject({ code: "RATE_LIMITED" });
    now = new Date(now.getTime() + 900001);
    await expect(another.throttle("login", "limited@example.test", "ip")).resolves.toBeUndefined();
  });
  it("preserves pre-existing Google customer ID and rejects new Google registration without policy", async () => {
    const googleRepo = new CustomerAuthRepository(prisma);
    const identity = { email: "existing@example.test", normalizedEmail: "existing@example.test", googleSubject: "existing-sub" };
    const existing = await prisma.customer.create({ data: { ...identity, emailVerifiedAt: now } });
    expect((await googleRepo.upsertGoogleCustomer(identity, now, false)).id).toBe(existing.id);
    await expect(googleRepo.upsertGoogleCustomer({ ...identity, email: "new@example.test", normalizedEmail: "new@example.test", googleSubject: "new-sub" }, now, false)).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
  });
});
