import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPrismaClient } from "@/lib/db/prisma";
import { AGE_DECLARATION_VERSION } from "@/modules/customer-auth/age-declaration";
import { hashOpaqueToken } from "@/modules/customer-auth/core";
import { CustomerAuthRepository } from "@/modules/customer-auth/repository";
import { CustomerEmailRepository } from "@/modules/customer-auth/email-repository";
import { CustomerEmailService } from "@/modules/customer-auth/email-service";
import { getCustomerAuthLegalDocuments } from "@/modules/customer-auth/legal";
import { closureIdentityHash } from "@/modules/customer-privacy/core";
import { eraseCustomerAccount, lockCustomerLifecycle } from "@/modules/customer-privacy/lifecycle";
import { inlineAuthProofDelivery } from "../helpers/inline-customer-delivery";

const prisma = getPrismaClient();
const repository = new CustomerEmailRepository(prisma);
const password = "public fixture passphrase 2026";
const nextPassword = "replacement fixture passphrase 2026";
const day = 86_400_000;
let now: Date;
let email: string;
let ip: string;
let mails: { to: string; token: string; purpose: "verify" | "reset" }[];
let service: CustomerEmailService;

function makeService() {
  return new CustomerEmailService(
    repository,
    inlineAuthProofDelivery(repository, { async send(mail) { mails.push(mail); } }, () => now),
    getCustomerAuthLegalDocuments(),
    () => now,
  );
}

function registration(overrides: Record<string, unknown> = {}) {
  return {
    name: "Public Auth Fixture", email, password, confirmPassword: password,
    consent: "on", ageDeclaration: "on", returnTo: "/account?source=public-fixture#work",
    termsVersion: "NIUVA-TERMS-v1.0", privacyVersion: "NIUVA-PRIVACY-v1.0",
    ...overrides,
  };
}

function lastToken(purpose: "verify" | "reset") {
  const mail = mails.filter(item => item.to === email && item.purpose === purpose).at(-1);
  expect(mail, `synthetic ${purpose} delivery exists`).toBeDefined();
  return mail!.token;
}

async function verifiedCustomer() {
  await service.register(registration(), ip);
  await service.verify(lastToken("verify"), ip);
  return prisma.customer.findUniqueOrThrow({ where: { normalizedEmail: email } });
}

async function expectPendingUnconsumed(token: string) {
  const record = await prisma.customerEmailToken.findUniqueOrThrow({ where: { tokenHash: hashOpaqueToken(token) }, include: { pending: true } });
  expect(record.consumedAt).toBeNull();
  expect(record.pending?.completedAt).toBeNull();
  expect(await prisma.customer.count({ where: { normalizedEmail: email } })).toBe(0);
}

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("NIUVA_CUSTOMER_AUTH_MOCK", "true");
  vi.stubEnv("NIUVA_CUSTOMER_PUBLIC_AUTH_TEST", "true");
  vi.stubEnv("NIUVA_INTERNAL_AUTH_ENABLED", "");
  vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "local-test");
  vi.stubEnv("NIUVA_PROVIDER_MODE", "mock");
  vi.stubEnv("APP_URL", "http://127.0.0.1:3107");
  now = new Date("2026-10-25T10:00:00Z");
  email = `public-auth-${randomUUID()}@example.test`;
  ip = `public-auth-${randomUUID()}`;
  mails = [];
  service = makeService();
});

afterEach(async () => {
  await prisma.order.deleteMany({ where: { customerEmail: email } });
  await prisma.customPrintRequest.deleteMany({ where: { customerEmail: email } });
  await prisma.b2BInquiry.deleteMany({ where: { email } });
  await prisma.customerPendingRegistration.deleteMany({ where: { normalizedEmail: email } });
  await prisma.customer.deleteMany({ where: { normalizedEmail: email } });
  await prisma.customerClosureFence.deleteMany({ where: { identityHash: closureIdentityHash(email) } });
  vi.unstubAllEnvs();
});

describe("T13 public email registration with official consent in PostgreSQL", () => {
  it("binds server versions and a separate age declaration before verification, then creates no automatic session", async () => {
    const acceptedAt = now;
    const result = await service.register(registration({
      ageDeclarationVersion: "CLIENT-FORGED", ageDeclaredAt: "2099-01-01T00:00:00Z",
    }), ip);
    expect(result.sent).toBe(true);
    const pending = await repository.findPending(result.handle!, now);
    expect(pending).toMatchObject({
      normalizedEmail: email, termsVersion: "NIUVA-TERMS-v1.0", privacyVersion: "NIUVA-PRIVACY-v1.0",
      consentAt: acceptedAt, ageDeclarationVersion: AGE_DECLARATION_VERSION, ageDeclaredAt: acceptedAt,
      completedAt: null,
    });
    expect(await prisma.customer.findUnique({ where: { normalizedEmail: email } })).toBeNull();
    await expect(service.login({ email, password }, ip)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    now = new Date(now.getTime() + 1_000);
    expect(await service.verify(lastToken("verify"), ip)).toBe("/account?source=public-fixture#work");
    const customer = await prisma.customer.findUniqueOrThrow({ where: { normalizedEmail: email }, include: { consents: true, sessions: true, passwordCredential: true } });
    expect(customer.emailVerifiedAt).toEqual(now);
    expect(customer.passwordCredential?.passwordHash).not.toContain(password);
    expect(customer.consents).toHaveLength(1);
    expect(customer.consents[0]).toMatchObject({
      termsVersion: "NIUVA-TERMS-v1.0", privacyVersion: "NIUVA-PRIVACY-v1.0", acceptedAt,
      ageDeclarationVersion: AGE_DECLARATION_VERSION, ageDeclaredAt: acceptedAt,
    });
    expect(customer.sessions).toEqual([]);
  });

  it.each([
    { consent: undefined }, { consent: true }, { ageDeclaration: undefined }, { ageDeclaration: "off" },
  ])("rejects absent or non-explicit consent/declaration %j before persistence or delivery", async invalid => {
    await expect(service.register(registration(invalid), ip)).rejects.toThrow();
    expect(await prisma.customerPendingRegistration.count({ where: { normalizedEmail: email } })).toBe(0);
    expect(await prisma.customer.count({ where: { normalizedEmail: email } })).toBe(0);
    expect(mails).toEqual([]);
  });

  it.each(["termsVersion", "privacyVersion"])("refuses a stale presented %s rather than silently accepting the server version", async field => {
    await expect(service.register(registration({ [field]: "SYNTHETIC-STALE-VERSION" }), ip)).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    expect(await prisma.customerPendingRegistration.count({ where: { normalizedEmail: email } })).toBe(0);
    expect(mails).toEqual([]);
  });

  it.each(["terms", "privacy"] as const)("rejects a pending %s version that no longer matches current policy without rewriting or consuming acceptance", async document => {
    await service.register(registration(), ip);
    const token = lastToken("verify");
    const pending = await prisma.customerPendingRegistration.findFirstOrThrow({ where: { normalizedEmail: email } });
    const previous = `SYNTHETIC-PREVIOUS-${document.toUpperCase()}`;
    await prisma.customerPendingRegistration.update({ where: { id: pending.id }, data: document === "terms" ? { termsVersion: previous } : { privacyVersion: previous } });
    await expect(service.verify(token, ip)).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    await expectPendingUnconsumed(token);
    const unchanged = await prisma.customerPendingRegistration.findUniqueOrThrow({ where: { id: pending.id } });
    expect(unchanged.termsVersion).toBe(document === "terms" ? previous : pending.termsVersion);
    expect(unchanged.privacyVersion).toBe(document === "privacy" ? previous : pending.privacyVersion);
    expect(unchanged.consentAt).toEqual(pending.consentAt);
  });

  it("refuses a pending public signup when the policy is withdrawn before verification", async () => {
    await service.register(registration(), ip);
    const token = lastToken("verify");
    vi.stubEnv("NIUVA_CUSTOMER_AUTH_MOCK", "false");
    await expect(service.verify(token, ip)).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    await expectPendingUnconsumed(token);
  });

  it("rejects verification at the exact 24-hour boundary without partially completing signup", async () => {
    await service.register(registration(), ip);
    const token = lastToken("verify");
    const record = await prisma.customerEmailToken.findUniqueOrThrow({ where: { tokenHash: hashOpaqueToken(token) } });
    expect(record.expiresAt.getTime() - now.getTime()).toBe(day);
    now = record.expiresAt;
    await expect(service.verify(token, ip)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expectPendingUnconsumed(token);
  });

  it("consumes a verification once under concurrent POST-equivalent requests and rejects replay", async () => {
    await service.register(registration(), ip);
    const token = lastToken("verify");
    const attempts = await Promise.allSettled([service.verify(token, ip), service.verify(token, ip)]);
    expect(attempts.filter(attempt => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter(attempt => attempt.status === "rejected")).toHaveLength(1);
    const customer = await prisma.customer.findUniqueOrThrow({ where: { normalizedEmail: email }, include: { consents: true, sessions: true } });
    expect(customer.consents).toHaveLength(1);
    expect(customer.sessions).toEqual([]);
    await expect(service.verify(token, ip)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("resends only after cooldown, revokes the prior link and preserves the original consent evidence", async () => {
    const result = await service.register(registration(), ip);
    const originalToken = lastToken("verify");
    const pending = await repository.findPending(result.handle!, now);
    await expect(service.resend(result.handle!, "/account", ip)).rejects.toMatchObject({ code: "RATE_LIMITED" });
    now = new Date(now.getTime() + 60_001);
    await service.resend(result.handle!, "/account", ip);
    const replacementToken = lastToken("verify");
    expect(replacementToken).not.toBe(originalToken);
    expect((await prisma.customerEmailToken.findUniqueOrThrow({ where: { tokenHash: hashOpaqueToken(originalToken) } })).consumedAt).toEqual(now);
    await expect(service.verify(originalToken, ip)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await service.verify(replacementToken, ip);
    const consent = await prisma.customerConsent.findFirstOrThrow({ where: { customer: { normalizedEmail: email } } });
    expect(consent).toMatchObject({
      termsVersion: pending!.termsVersion, privacyVersion: pending!.privacyVersion,
      acceptedAt: pending!.consentAt, ageDeclaredAt: pending!.ageDeclaredAt,
    });
  });

  it("expires password reset at 30 minutes without changing credentials or revoking a live session", async () => {
    const customer = await verifiedCustomer();
    const login = await service.login({ email, password }, ip);
    await service.forgot(email, "/account", ip);
    const token = lastToken("reset");
    const record = await prisma.customerEmailToken.findUniqueOrThrow({ where: { tokenHash: hashOpaqueToken(token) } });
    expect(record.expiresAt.getTime() - now.getTime()).toBe(30 * 60_000);
    now = record.expiresAt;
    await expect(service.reset(token, nextPassword, nextPassword, ip)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(await prisma.customerSession.count({ where: { customerId: customer.id, revokedAt: null, tokenHash: hashOpaqueToken(login.token) } })).toBe(1);
    await expect(service.login({ email, password }, ip)).resolves.toMatchObject({ returnTo: "/account" });
  });

  it("keeps verify/reset purposes separate and makes reset revoke every existing session exactly once", async () => {
    const customer = await verifiedCustomer();
    await service.login({ email, password }, ip);
    await service.login({ email, password, remember: "on" }, ip);
    await service.forgot(email, "/account", ip);
    const token = lastToken("reset");
    await expect(service.verify(token, ip)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await service.reset(token, nextPassword, nextPassword, ip);
    expect(await prisma.customerSession.count({ where: { customerId: customer.id, revokedAt: null } })).toBe(0);
    expect(await prisma.customerSession.count({ where: { customerId: customer.id, revokedAt: now } })).toBe(2);
    await expect(service.reset(token, password, password, ip)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(service.login({ email, password }, ip)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(service.login({ email, password: nextPassword }, ip)).resolves.toMatchObject({ returnTo: "/account" });
  });

  it("revokes old reset/session access on closure and keeps closed business history detached after a fresh signup", async () => {
    const original = await verifiedCustomer();
    const login = await service.login({ email, password }, ip);
    await service.forgot(email, "/account", ip);
    const resetToken = lastToken("reset");
    const order = await prisma.order.create({ data: {
      customerId: original.id, orderNumber: `PUBLIC-AUTH-${randomUUID()}`, orderType: "RETAIL", status: "PROCESSING",
      customerName: "Public Fixture", customerEmail: email, customerPhone: "TEST",
      publicTokenHash: randomUUID(), grandTotalRp: "100", itemsSubtotalRp: "100", shippingTotalRp: "0",
    } });
    const custom = await prisma.customPrintRequest.create({ data: {
      customerId: original.id, referenceNumber: `PUBLIC-AUTH-${randomUUID()}`, customerName: "Public Fixture",
      customerEmail: email, customerPhone: "TEST", materialRequested: "PLA", quantity: 1, publicTokenHash: randomUUID(),
    } });
    const closedAt = new Date(now.getTime() + 1_000);
    await prisma.$transaction(async tx => {
      await lockCustomerLifecycle(tx);
      expect(await eraseCustomerAccount(tx, original.id, closedAt)).toBe(true);
    });
    now = new Date(closedAt.getTime() + 1_000);
    await expect(service.reset(resetToken, nextPassword, nextPassword, ip)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(await prisma.customerSession.findUnique({ where: { tokenHash: hashOpaqueToken(login.token) } })).toBeNull();
    const fresh = await verifiedCustomer();
    expect(fresh.id).not.toBe(original.id);
    expect((await new CustomerAuthRepository(prisma).getAccount(fresh.id))?.orders).toEqual([]);
    const retainedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    const retainedCustom = await prisma.customPrintRequest.findUniqueOrThrow({ where: { id: custom.id } });
    expect(retainedOrder).toMatchObject({ customerId: null, accountClosedAt: closedAt, status: "PROCESSING" });
    expect(retainedCustom).toMatchObject({ customerId: null, accountClosedAt: closedAt });
    expect(retainedOrder.publicTokenHash).not.toBe(order.publicTokenHash);
    expect(retainedCustom.publicTokenHash).not.toBe(custom.publicTokenHash);
  });
});
