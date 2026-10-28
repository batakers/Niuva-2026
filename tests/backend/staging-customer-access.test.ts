import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomerPendingRegistration } from "@/generated/prisma/client";
vi.mock("@/lib/db/prisma", () => ({ getPrismaClient: () => ({}) }));
vi.mock("@/modules/customer-auth/password", async importOriginal => ({
  ...await importOriginal<typeof import("@/modules/customer-auth/password")>(), hashPassword: vi.fn().mockResolvedValue("TEST-ONLY-HASH"),
}));
import { CustomerEmailService } from "@/modules/customer-auth/email-service";
import { CustomerEmailRepository } from "@/modules/customer-auth/email-repository";
import { createCustomerAuthMailer } from "@/modules/customer-auth/email-mailer";
import { getStagingCustomerAuthLegalDocuments } from "@/modules/customer-auth/legal";
import { assertStagingCustomerTester, getStagingCustomerTesters } from "@/modules/customer-auth/staging-testers";
import { assertS3PrivateStorageAllowed } from "@/modules/files/s3";
import { assertResendDeliveryAllowed } from "@/modules/notifications/resend";
import { createBusinessMailer } from "@/modules/outbox/business-mailer";
import type { CustomerAuthProofDelivery } from "@/modules/outbox/producer";

// Owner decision E1: staging Customer accounts and mail only for listed testers.
// A hosted build always runs NODE_ENV=production; only the explicit staging tier
// may use providers there, and production stays closed.
const TESTERS = "Tester.One@example.test, tester-two@example.test";
const hosted = {
  NODE_ENV: "production", NIUVA_DEPLOYMENT_TIER: "staging", NIUVA_PROVIDER_MODE: "sandbox", APP_URL: "https://staging.example.test",
  DATABASE_URL: "postgresql://fixture@db.example.test/niuva_staging?sslmode=verify-full", RESEND_API_KEY: "synthetic-staging-key",
  EMAIL_FROM: "Niuva <no-reply@example.test>", NIUVA_STAGING_CUSTOMER_EMAILS: TESTERS,
};
const content = { reference: "TEST-STAGING", accountPath: "/account/orders/00000000-0000-4000-8000-000000000001" };

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe("staging tester list", () => {
  it("is read only for an explicit staging tier, normalized, and closed when missing or malformed", () => {
    expect([...getStagingCustomerTesters(hosted)!]).toEqual(["tester.one@example.test", "tester-two@example.test"]);
    for (const tier of [undefined, "production", "local-test"]) expect(getStagingCustomerTesters({ ...hosted, NIUVA_DEPLOYMENT_TIER: tier }), String(tier)).toBeNull();
    const eleven = Array.from({ length: 11 }, (_, index) => `t${index}@example.test`).join(",");
    for (const list of [undefined, "", " , ", "not-an-email", eleven]) expect(getStagingCustomerTesters({ ...hosted, NIUVA_STAGING_CUSTOMER_EMAILS: list }), String(list)).toBeNull();
  });

  it("accepts only listed addresses", () => {
    const testers = getStagingCustomerTesters(hosted);
    expect(() => assertStagingCustomerTester(" TESTER-TWO@example.test ", testers)).not.toThrow();
    expect(() => assertStagingCustomerTester("stranger@example.test", testers)).toThrow(expect.objectContaining({ code: "CUSTOMER_AUTH_UNAVAILABLE" }));
    expect(() => assertStagingCustomerTester("tester-two@example.test", null)).toThrow(expect.objectContaining({ code: "CUSTOMER_AUTH_UNAVAILABLE" }));
  });
});

describe("hosted staging providers", () => {
  it("lets Resend and S3 run under NODE_ENV=production only with the explicit staging tier", () => {
    const resend = { apiKey: "synthetic-staging-key", from: "Niuva <no-reply@example.test>", nodeEnv: "production" } as const;
    const s3 = { accessKeyId: "a", secretAccessKey: "b", endpoint: "https://s3.example.test", region: "auto", privateBucket: "private", nodeEnv: "production" } as const;
    expect(() => assertResendDeliveryAllowed({ ...resend, capabilityEnv: hosted })).not.toThrow();
    expect(() => assertS3PrivateStorageAllowed({ ...s3, capabilityEnv: hosted })).not.toThrow();
    for (const tier of [undefined, "production"]) {
      const env = { ...hosted, NIUVA_DEPLOYMENT_TIER: tier };
      expect(() => assertResendDeliveryAllowed({ ...resend, capabilityEnv: env }), String(tier)).toThrow(expect.objectContaining({ code: "PROVIDER_UNAVAILABLE" }));
      expect(() => assertS3PrivateStorageAllowed({ ...s3, capabilityEnv: env }), String(tier)).toThrow(expect.objectContaining({ code: "PROVIDER_UNAVAILABLE" }));
    }
  });

  it("builds the Customer auth and business mailers on staging for testers only", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const auth = createCustomerAuthMailer(hosted), business = createBusinessMailer(hosted);
    const mail = { token: "t".repeat(43), purpose: "verify" as const, returnTo: "/checkout", idempotencyKey: "staging-key" };
    expect(auth!.prepare!({ ...mail, to: "tester.one@example.test" }).envelope.to).toBe("tester.one@example.test");
    expect(() => auth!.prepare!({ ...mail, to: "stranger@example.test" })).toThrow();
    expect(business!.prepare({ to: "tester-two@example.test", purpose: "ORDER_RECEIVED", content, idempotencyKey: "k" }).envelope.to).toBe("tester-two@example.test");
    expect(() => business!.prepare({ to: "stranger@example.test", purpose: "ORDER_RECEIVED", content, idempotencyKey: "k" })).toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("keeps both mailers closed without a tester list or outside an explicit staging tier", () => {
    for (const source of [{ ...hosted, NIUVA_STAGING_CUSTOMER_EMAILS: undefined }, { ...hosted, NIUVA_DEPLOYMENT_TIER: "production" }, { ...hosted, NIUVA_DEPLOYMENT_TIER: undefined }]) {
      expect(createCustomerAuthMailer(source)).toBeNull();
      expect(createBusinessMailer(source)).toBeNull();
    }
  });

  it("offers the published v1.0 policy for staging registration only with a tester list", () => {
    expect(getStagingCustomerAuthLegalDocuments(hosted)).toEqual({
      terms: { href: "/terms", version: "NIUVA-TERMS-v1.0" },
      privacy: { href: "/privacy", version: "NIUVA-PRIVACY-v1.0" },
    });
    expect(getStagingCustomerAuthLegalDocuments({ ...hosted, NIUVA_STAGING_CUSTOMER_EMAILS: "" })).toBeNull();
    expect(getStagingCustomerAuthLegalDocuments({ ...hosted, NIUVA_DEPLOYMENT_TIER: "production" })).toBeNull();
  });
});

describe("staging Customer registration and login", () => {
  const now = new Date("2026-10-29T12:00:00Z");
  const legal = { terms: { href: "/terms", version: "NIUVA-TERMS-v1.0" }, privacy: { href: "/privacy", version: "NIUVA-PRIVACY-v1.0" } };
  const input = { name: "Staging Tester", email: "tester.one@example.test", password: "staging fixture password", confirmPassword: "staging fixture password",
    consent: "on", ageDeclaration: "on", termsVersion: "NIUVA-TERMS-v1.0", privacyVersion: "NIUVA-PRIVACY-v1.0", returnTo: "/checkout" };
  beforeEach(() => {
    // The service reads the ambient tier; NODE_ENV stays "test" under Vitest, an explicit tier still wins.
    for (const [key, value] of Object.entries({ ...hosted, NODE_ENV: "test" })) vi.stubEnv(key, value);
  });
  function setup() {
    const repository = new CustomerEmailRepository();
    vi.spyOn(repository, "limit").mockResolvedValue();
    const findCredential = vi.spyOn(repository, "findCredential").mockResolvedValue(null);
    const createPending = vi.spyOn(repository, "createPending").mockImplementation(async data => ({
      ...data, id: "pending-staging-id", internalTestExpiresAt: null, ageDeclarationVersion: data.ageDeclarationVersion ?? null,
      ageDeclaredAt: data.ageDeclaredAt ?? null, deliveryConfirmed: false, sentAt: null, completedAt: null,
    } satisfies CustomerPendingRegistration));
    const issue = vi.fn<CustomerAuthProofDelivery["issue"]>().mockResolvedValue("queued");
    return { findCredential, createPending, issue, service: new CustomerEmailService(repository, { issue }, legal, () => now) };
  }

  it("registers a listed tester against the published policy", async () => {
    const { createPending, issue, service } = setup();
    expect(await service.register(input, "fixture-ip")).toMatchObject({ queued: true });
    expect(createPending).toHaveBeenCalledWith(expect.objectContaining({ termsVersion: "NIUVA-TERMS-v1.0", privacyVersion: "NIUVA-PRIVACY-v1.0", internalTestExpiresAt: null }));
    expect(issue).toHaveBeenCalledWith(expect.objectContaining({ purpose: "verify", to: input.email }));
  });

  it("refuses registration and login for an unlisted address before any account work", async () => {
    const { findCredential, createPending, issue, service } = setup();
    await expect(service.register({ ...input, email: "stranger@example.test" }, "fixture-ip")).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    await expect(service.login({ email: "stranger@example.test", password: input.password }, "fixture-ip")).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    expect(findCredential).not.toHaveBeenCalled(); expect(createPending).not.toHaveBeenCalled(); expect(issue).not.toHaveBeenCalled();
  });

  it("keeps production registration (no policy documents) and login (capability matrix) closed", async () => {
    vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "production");
    const { findCredential, createPending, service } = setup();
    await expect(service.register(input, "fixture-ip")).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    await expect(service.login({ email: input.email, password: input.password }, "fixture-ip")).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    expect(findCredential).not.toHaveBeenCalled(); expect(createPending).not.toHaveBeenCalled();
  });
});
