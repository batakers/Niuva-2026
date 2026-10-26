import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPrismaClient } from "@/lib/db/prisma";
import { AGE_DECLARATION_VERSION } from "@/modules/customer-auth/age-declaration";
import { createCustomerOAuthState, hashOpaqueToken, type CustomerGoogleIdentity } from "@/modules/customer-auth/core";
import { GoogleConsentRepository, GoogleConsentService, type PublicGoogleRegistration } from "@/modules/customer-auth/google-consent";
import { CustomerAuthRepository } from "@/modules/customer-auth/repository";
import { CustomerAuthService } from "@/modules/customer-auth/service";
import { closureGoogleHash, closureIdentityHash } from "@/modules/customer-privacy/core";
import { eraseCustomerAccount, lockCustomerLifecycle } from "@/modules/customer-privacy/lifecycle";

const prisma = getPrismaClient();
const consent = new GoogleConsentService(new GoogleConsentRepository(prisma));
const returnTo = "/account?source=public-google#work";
const proofHashes = new Set<string>();
let identity: CustomerGoogleIdentity;
let now: Date;
let auth: CustomerAuthService;

function input(overrides: Record<string, unknown> = {}) {
  return {
    consent: "on", ageDeclaration: "on", termsVersion: "NIUVA-TERMS-v1.0", privacyVersion: "NIUVA-PRIVACY-v1.0",
    returnTo, ...overrides,
  };
}

async function issue(overrides: Record<string, unknown> = {}) {
  const token = await consent.accept(input(overrides), now);
  proofHashes.add(hashOpaqueToken(token));
  return token;
}

async function bound() {
  const consentToken = await issue();
  const state = createCustomerOAuthState(now.getTime());
  await consent.bind(consentToken, state, returnTo, now);
  return { registration: { consentToken, state, returnTo }, startedAt: now };
}

function complete(attempt: { registration: PublicGoogleRegistration; startedAt: Date }) {
  return auth.completeGoogleLogin(identity, undefined, attempt.startedAt, attempt.registration);
}

async function expectUnclaimed(token: string) {
  expect((await prisma.customerGoogleConsent.findUniqueOrThrow({ where: { tokenHash: hashOpaqueToken(token) } })).consumedAt).toBeNull();
  expect(await prisma.customer.count({ where: { normalizedEmail: identity.normalizedEmail } })).toBe(0);
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
  const email = `public-google-${randomUUID()}@example.test`;
  identity = { email, normalizedEmail: email, googleSubject: `public-google-${randomUUID()}`, displayName: "Verified Provider Fixture" };
  auth = new CustomerAuthService({ now: () => now, repository: new CustomerAuthRepository(prisma) });
});

afterEach(async () => {
  try {
    await prisma.order.deleteMany({ where: { customerEmail: identity.email } });
    await prisma.customPrintRequest.deleteMany({ where: { customerEmail: identity.email } });
    await prisma.b2BInquiry.deleteMany({ where: { email: identity.email } });
    await prisma.customer.deleteMany({ where: { normalizedEmail: identity.normalizedEmail } });
    await prisma.customerGoogleConsent.deleteMany({ where: { tokenHash: { in: [...proofHashes] } } });
    await prisma.customerClosureFence.deleteMany({ where: { identityHash: { in: [closureIdentityHash(identity.normalizedEmail), closureGoogleHash(identity.googleSubject)] } } });
    proofHashes.clear();
  } finally { vi.unstubAllEnvs(); }
});

describe("T12 public Google consent and verified identity in PostgreSQL", () => {
  it("uses only the verified provider identity and records server versions, age and hashed state atomically", async () => {
    const token = await issue({ email: "client-forged@example.test", googleSubject: "CLIENT-FORGED", ageDeclarationVersion: "CLIENT-FORGED", ageDeclaredAt: "2099-01-01T00:00:00Z" });
    const state = createCustomerOAuthState(now.getTime());
    await consent.bind(token, state, returnTo, now);
    const result = await auth.completeGoogleLogin(identity, undefined, now, { consentToken: token, state, returnTo });
    const proof = await prisma.customerGoogleConsent.findUniqueOrThrow({ where: { tokenHash: hashOpaqueToken(token) } });
    expect(proof).toMatchObject({
      oauthStateHash: hashOpaqueToken(state), returnTo, consumedAt: now, acceptedAt: now,
      termsVersion: "NIUVA-TERMS-v1.0", privacyVersion: "NIUVA-PRIVACY-v1.0",
      ageDeclarationVersion: AGE_DECLARATION_VERSION, ageDeclaredAt: now,
    });
    expect(proof.tokenHash).not.toBe(token);
    expect(proof.oauthStateHash).not.toBe(state);
    const customer = await prisma.customer.findUniqueOrThrow({ where: { id: result.customer.id }, include: { consents: true, sessions: true } });
    expect(customer).toMatchObject({ email: identity.email, googleSubject: identity.googleSubject });
    expect(customer.consents).toHaveLength(1);
    expect(customer.consents[0]).toMatchObject({ method: "google", termsVersion: proof.termsVersion, privacyVersion: proof.privacyVersion, acceptedAt: now, ageDeclarationVersion: AGE_DECLARATION_VERSION, ageDeclaredAt: now });
    expect(customer.sessions).toHaveLength(1);
  });

  it.each([
    { consent: undefined }, { consent: true }, { ageDeclaration: undefined }, { ageDeclaration: "off" },
    { termsVersion: "SYNTHETIC-OLD-TERMS" }, { privacyVersion: "SYNTHETIC-OLD-PRIVACY" },
  ])("refuses invalid or stale presented consent %j before issuing any proof", async invalid => {
    const count = await prisma.customerGoogleConsent.count();
    await expect(consent.accept(input(invalid), now)).rejects.toThrow();
    expect(await prisma.customerGoogleConsent.count()).toBe(count);
    expect(await prisma.customer.count({ where: { normalizedEmail: identity.normalizedEmail } })).toBe(0);
  });

  it("does not create an ordinary Google account without the required public proof", async () => {
    await expect(auth.completeGoogleLogin(identity, undefined, now)).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    expect(await prisma.customer.count({ where: { normalizedEmail: identity.normalizedEmail } })).toBe(0);
  });

  it.each(["state", "destination"] as const)("rejects a different OAuth %s and leaves the legitimate proof usable", async changed => {
    const attempt = await bound();
    const wrong = { ...attempt.registration, ...(changed === "state" ? { state: createCustomerOAuthState(now.getTime()) } : { returnTo: "/checkout" }) };
    await expect(auth.completeGoogleLogin(identity, undefined, now, wrong)).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    await expectUnclaimed(attempt.registration.consentToken);
    await expect(complete(attempt)).resolves.toMatchObject({ customer: { email: identity.email } });
  });

  it("binds a proof once and refuses a second OAuth attempt without overwriting its state", async () => {
    const attempt = await bound();
    await expect(consent.bind(attempt.registration.consentToken, createCustomerOAuthState(now.getTime()), returnTo, now)).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    const proof = await prisma.customerGoogleConsent.findUniqueOrThrow({ where: { tokenHash: hashOpaqueToken(attempt.registration.consentToken) } });
    expect(proof.oauthStateHash).toBe(hashOpaqueToken(attempt.registration.state));
    expect(proof.consumedAt).toBeNull();
  });

  it("rejects proof expiry at exactly ten minutes without creating an account or consuming the proof", async () => {
    const attempt = await bound();
    const proof = await prisma.customerGoogleConsent.findUniqueOrThrow({ where: { tokenHash: hashOpaqueToken(attempt.registration.consentToken) } });
    expect(proof.expiresAt.getTime() - now.getTime()).toBe(600_000);
    now = proof.expiresAt;
    await expect(complete(attempt)).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    await expectUnclaimed(attempt.registration.consentToken);
  });

  it.each(["terms", "privacy", "age-version", "future-age", "future-consent"])("revalidates stored %s evidence at callback and rolls back a rejected claim", async invalid => {
    const attempt = await bound();
    const data: { termsVersion?: string; privacyVersion?: string; ageDeclarationVersion?: string; ageDeclaredAt?: Date; acceptedAt?: Date } = {};
    if (invalid === "terms") data.termsVersion = "SYNTHETIC-PREVIOUS-TERMS";
    if (invalid === "privacy") data.privacyVersion = "SYNTHETIC-PREVIOUS-PRIVACY";
    if (invalid === "age-version") data.ageDeclarationVersion = "SYNTHETIC-PREVIOUS-AGE";
    if (invalid === "future-age") data.ageDeclaredAt = new Date(now.getTime() + 1_000);
    if (invalid === "future-consent") data.acceptedAt = new Date(now.getTime() + 1_000);
    await prisma.customerGoogleConsent.update({ where: { tokenHash: hashOpaqueToken(attempt.registration.consentToken) }, data });
    await expect(complete(attempt)).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    await expectUnclaimed(attempt.registration.consentToken);
  });

  it("rechecks public eligibility after proof issuance instead of trusting the earlier page or constructor", async () => {
    const attempt = await bound();
    vi.stubEnv("NIUVA_CUSTOMER_AUTH_MOCK", "false");
    await expect(complete(attempt)).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    await expectUnclaimed(attempt.registration.consentToken);
  });

  it("allows one concurrent callback and rejects replay even after the account exists, while ordinary existing login still works", async () => {
    const attempt = await bound();
    const results = await Promise.allSettled([complete(attempt), complete(attempt)]);
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
    const customer = await prisma.customer.findUniqueOrThrow({ where: { normalizedEmail: identity.normalizedEmail }, include: { consents: true, sessions: true } });
    expect(customer.consents).toHaveLength(1);
    expect(customer.sessions).toHaveLength(1);
    await expect(complete(attempt)).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    expect(await prisma.customerSession.count({ where: { customerId: customer.id } })).toBe(1);
    await expect(auth.completeGoogleLogin(identity, undefined, now)).resolves.toMatchObject({ customer: { id: customer.id } });
    expect(await prisma.customerSession.count({ where: { customerId: customer.id } })).toBe(2);
    expect(await prisma.customerConsent.count({ where: { customerId: customer.id } })).toBe(1);
  });

  it("does not attach a Google subject to a password account sharing its verified email", async () => {
    const existing = await prisma.customer.create({ data: { email: identity.email, normalizedEmail: identity.normalizedEmail, emailVerifiedAt: now, passwordCredential: { create: { passwordHash: "synthetic-credential-only" } } } });
    const attempt = await bound();
    await expect(complete(attempt)).rejects.toThrow();
    expect((await prisma.customer.findUniqueOrThrow({ where: { id: existing.id } })).googleSubject).toBeNull();
    expect(await prisma.customerSession.count({ where: { customerId: existing.id } })).toBe(0);
    expect((await prisma.customerGoogleConsent.findUniqueOrThrow({ where: { tokenHash: hashOpaqueToken(attempt.registration.consentToken) } })).consumedAt).toBeNull();
  });

  it("rejects pre-closure OAuth intent and keeps closed order, MAKE and historical B2B records detached after fresh consent", async () => {
    const first = await complete(await bound());
    const customerId = first.customer.id;
    const order = await prisma.order.create({ data: { customerId, orderNumber: `PUBLIC-GOOGLE-${randomUUID()}`, orderType: "RETAIL", status: "PROCESSING", customerName: "Public Fixture", customerEmail: identity.email, customerPhone: "TEST", publicTokenHash: randomUUID(), grandTotalRp: "100", itemsSubtotalRp: "100", shippingTotalRp: "0" } });
    const custom = await prisma.customPrintRequest.create({ data: { customerId, referenceNumber: `PUBLIC-GOOGLE-${randomUUID()}`, customerName: "Public Fixture", customerEmail: identity.email, customerPhone: "TEST", materialRequested: "PLA", quantity: 1, publicTokenHash: randomUUID() } });
    const inquiry = await prisma.b2BInquiry.create({ data: { customerId, referenceNumber: `PUBLIC-GOOGLE-${randomUUID()}`, name: "Historical Fixture", email: identity.email, phone: "TEST", projectGoal: "Test", currentStage: "IDEA", description: "Historical test only", targetQuantity: "1", confidentialityAck: true, publicTokenHash: randomUUID() } });
    const stale = await bound();
    const closedAt = new Date(now.getTime() + 1_000);
    await prisma.$transaction(async tx => { await lockCustomerLifecycle(tx); expect(await eraseCustomerAccount(tx, customerId, closedAt)).toBe(true); });
    now = new Date(closedAt.getTime() + 1_000);
    await expect(complete(stale)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    const fresh = await complete(await bound());
    expect(fresh.customer.id).not.toBe(customerId);
    expect((await new CustomerAuthRepository(prisma).getAccount(fresh.customer.id))?.orders).toEqual([]);
    for (const retained of [
      await prisma.order.findUniqueOrThrow({ where: { id: order.id } }),
      await prisma.customPrintRequest.findUniqueOrThrow({ where: { id: custom.id } }),
      await prisma.b2BInquiry.findUniqueOrThrow({ where: { id: inquiry.id } }),
    ]) expect(retained).toMatchObject({ customerId: null, accountClosedAt: closedAt });
    expect((await prisma.order.findUniqueOrThrow({ where: { id: order.id } })).publicTokenHash).not.toBe(order.publicTokenHash);
  });
});
