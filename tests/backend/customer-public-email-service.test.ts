import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomerPendingRegistration } from "@/generated/prisma/client";
vi.mock("@/lib/db/prisma", () => ({ getPrismaClient: () => ({}) }));
vi.mock("@/modules/customer-auth/password", async importOriginal => ({
  ...await importOriginal<typeof import("@/modules/customer-auth/password")>(), hashPassword: vi.fn().mockResolvedValue("TEST-ONLY-HASH"),
}));
import { CustomerEmailService } from "@/modules/customer-auth/email-service";
import { CustomerEmailRepository } from "@/modules/customer-auth/email-repository";
import { getCustomerAuthLegalDocuments } from "@/modules/customer-auth/legal";
import { AGE_DECLARATION_VERSION } from "@/modules/customer-auth/age-declaration";
import type { CustomerAuthProofDelivery } from "@/modules/outbox/producer";

const now = new Date("2026-10-25T12:00:00Z");
const input = { name: "Local Adult", email: "adult@example.test", password: "local fixture password", confirmPassword: "local fixture password",
  consent: "on", ageDeclaration: "on", termsVersion: "NIUVA-TERMS-v1.0", privacyVersion: "NIUVA-PRIVACY-v1.0", returnTo: "/checkout" };
beforeEach(() => {
  for (const [key, value] of Object.entries({ NODE_ENV: "test", NIUVA_CUSTOMER_AUTH_MOCK: "true", NIUVA_CUSTOMER_PUBLIC_AUTH_TEST: "true", DATABASE_URL: "postgresql://fixture@127.0.0.1/niuva_public_test", APP_URL: "http://127.0.0.1:3000", NIUVA_INTERNAL_AUTH_ENABLED: "false", NIUVA_DEPLOYMENT_TIER: "local-test", NIUVA_PROVIDER_MODE: "mock" })) vi.stubEnv(key, value);
});
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
function setup() {
  const repository = new CustomerEmailRepository();
  vi.spyOn(repository, "limit").mockResolvedValue();
  vi.spyOn(repository, "findCredential").mockResolvedValue(null);
  const createPending = vi.spyOn(repository, "createPending").mockImplementation(async data => ({
    ...data, id: "pending-local-id", internalTestExpiresAt: data.internalTestExpiresAt ?? null,
    ageDeclarationVersion: data.ageDeclarationVersion ?? null, ageDeclaredAt: data.ageDeclaredAt ?? null,
    deliveryConfirmed: false, sentAt: null, completedAt: null,
  } satisfies CustomerPendingRegistration));
  const issue = vi.fn<CustomerAuthProofDelivery["issue"]>().mockResolvedValue("queued");
  const service = new CustomerEmailService(repository, { issue }, getCustomerAuthLegalDocuments(), () => now);
  return { repository, createPending, issue, service };
}
describe("public verified-email registration boundary", () => {
  it("records only server-selected official policy, age version/time and pending password", async () => {
    const { createPending, issue, service } = setup();
    expect(await service.register({ ...input, ageDeclaredAt: "2099-01-01", ageDeclarationVersion: "FORGED", consentAt: "2099-01-01" }, "fixture-ip")).toMatchObject({ sent: false, queued: true });
    expect(createPending).toHaveBeenCalledWith(expect.objectContaining({
      termsVersion: input.termsVersion, privacyVersion: input.privacyVersion, consentAt: now,
      ageDeclarationVersion: AGE_DECLARATION_VERSION, ageDeclaredAt: now,
      internalTestExpiresAt: null, expiresAt: new Date(now.getTime() + 86400000), passwordHash: "TEST-ONLY-HASH",
    }));
    expect(issue).toHaveBeenCalledWith(expect.objectContaining({ purpose: "verify", owner: { pendingId: "pending-local-id" }, to: input.email }));
  });
  it.each([{ termsVersion: undefined }, { privacyVersion: "DRAFT-PRIVACY-v7" }, { termsVersion: "INTERNAL-TERMS-2026-10-02-v1" },
    { consent: undefined }, { ageDeclaration: true }])("rejects invalid acceptance before pending/token creation: %j", async change => {
    const { createPending, issue, service } = setup();
    await expect(service.register({ ...input, ...change }, "fixture-ip")).rejects.toThrow();
    expect(createPending).not.toHaveBeenCalled(); expect(issue).not.toHaveBeenCalled();
  });
  it("rechecks pending consent on resend before issuing another verification proof", async () => {
    const { repository, createPending, issue, service } = setup();
    await service.register(input, "fixture-ip");
    const pending = { ...await createPending.mock.results[0].value, deliveryQueued: false };
    vi.spyOn(repository, "findPending").mockResolvedValue({ ...pending, privacyVersion: "OLD" });
    issue.mockClear();
    await expect(service.resend("h".repeat(43), "/checkout", "fixture-ip")).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    expect(issue).not.toHaveBeenCalled();
  });
  it("returns cooldown before durable delivery and allows a resend at the exact boundary", async () => {
    const { repository, createPending, issue, service } = setup();
    await service.register(input, "fixture-ip");
    const pending = { ...await createPending.mock.results[0].value, deliveryQueued: false, sentAt: new Date(now.getTime() - 59_999) };
    const find = vi.spyOn(repository, "findPending").mockResolvedValue(pending);
    issue.mockClear();
    await expect(service.resend("h".repeat(43), "/checkout", "fixture-ip")).rejects.toMatchObject({ code: "RATE_LIMITED" });
    expect(issue).not.toHaveBeenCalled();
    find.mockResolvedValue({ ...pending, sentAt: new Date(now.getTime() - 60_000) });
    await expect(service.resend("h".repeat(43), "/checkout", "fixture-ip")).resolves.toBe("queued");
    expect(issue).toHaveBeenCalledOnce();
  });
  it("rejects register and resend when public eligibility is withdrawn after service construction", async () => {
    const { repository, createPending, issue, service } = setup();
    await service.register(input, "fixture-ip");
    const pending = { ...await createPending.mock.results[0].value, deliveryQueued: false };
    vi.spyOn(repository, "findPending").mockResolvedValue(pending);
    issue.mockClear(); createPending.mockClear();
    vi.stubEnv("NIUVA_CUSTOMER_PUBLIC_AUTH_TEST", "false");
    await expect(service.register(input, "fixture-ip")).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    await expect(service.resend("h".repeat(43), "/checkout", "fixture-ip")).rejects.toMatchObject({ code: "CUSTOMER_AUTH_UNAVAILABLE" });
    expect(issue).not.toHaveBeenCalled(); expect(createPending).not.toHaveBeenCalled();
  });
  it("passes current legal eligibility to atomic consumption without issuing a session", async () => {
    const { repository, service } = setup();
    const consume = vi.spyOn(repository, "consumeVerification").mockResolvedValue("/checkout");
    expect(await service.verify("t".repeat(43), "fixture-ip")).toBe("/checkout");
    expect(consume).toHaveBeenCalledWith("t".repeat(43), now, service.legal);
  });
});
