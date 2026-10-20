import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBusinessMailer } from "@/modules/outbox/business-mailer";

const source = { NODE_ENV: "test", NIUVA_DEPLOYMENT_TIER: "local-test", NIUVA_PROVIDER_MODE: "sandbox", NIUVA_CUSTOMER_AUTH_MOCK: "false", APP_URL: "http://127.0.0.1:3000", DATABASE_URL: "postgresql://fixture@127.0.0.1:55432/niuva_test?schema=public", RESEND_API_KEY: "synthetic-worker-key", EMAIL_FROM: "hello@example.test" };
const internalSource = { ...source, NODE_ENV: "development", NIUVA_RUNTIME_MODE: "live", DATABASE_URL: "postgresql://fixture@127.0.0.1:55433/niuva_dev?schema=public", NIUVA_INTERNAL_AUTH_ENABLED: "true", NIUVA_INTERNAL_GOOGLE_EMAIL: "google@example.test", NIUVA_INTERNAL_PASSWORD_EMAIL: "buyer@example.test" };
const content = { reference: "TEST-MAILER", accountPath: `/account/orders/${randomUUID()}` };
afterEach(() => { vi.restoreAllMocks(); });
describe("business mailer provider boundary", () => {
  it("freezes explicit source and carries the original bytes, key and abort signal to an injected provider", async () => {
    const fakeFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ id: "synthetic-mailer-receipt" }));
    const supplied = { ...source }, mailer = createBusinessMailer(supplied), controller = new AbortController();
    supplied.NIUVA_PROVIDER_MODE = "live";
    const prepared = mailer!.prepare({ to: "buyer@example.test", purpose: "ORDER_RECEIVED", content, idempotencyKey: "business-key" });
    expect(await prepared.send(prepared.envelope, "business-key", controller.signal)).toEqual({ id: "synthetic-mailer-receipt" });
    const call = fakeFetch.mock.calls[0]; expect(call[0]).toBe("https://api.resend.com/emails");
    expect(call[1]).toMatchObject({ signal: controller.signal, headers: { "Idempotency-Key": "business-key" } });
    expect(JSON.parse(String(call[1]?.body))).toMatchObject({ to: ["buyer@example.test"], text: prepared.envelope.text, subject: prepared.envelope.subject });
    expect(prepared.envelope.text).not.toMatch(/token=|\/quote\/|r2/);
  });
  it("preserves both approved internal recipients and refuses arbitrary addresses before provider access", () => {
    const fakeFetch = vi.spyOn(globalThis, "fetch"), mailer = createBusinessMailer(internalSource);
    for (const to of ["google@example.test", "buyer@example.test"]) expect(mailer!.prepare({ to, purpose: "ORDER_SHIPPED", content, idempotencyKey: "internal-key" }).envelope.to).toBe(to);
    expect(() => mailer!.prepare({ to: "foreign@example.test", purpose: "ORDER_RECEIVED", content, idempotencyKey: "internal-key" })).toThrow();
    expect(fakeFetch).not.toHaveBeenCalled();
  });
  it("keeps production, missing configuration and unapproved internal runtime closed", () => {
    const fakeFetch = vi.spyOn(globalThis, "fetch");
    expect(createBusinessMailer({ ...source, NODE_ENV: "production" })).toBeNull();
    expect(createBusinessMailer({ ...source, RESEND_API_KEY: undefined })).toBeNull();
    expect(createBusinessMailer({ ...internalSource, NIUVA_INTERNAL_AUTH_ENABLED: "false" })).toBeNull();
    expect(fakeFetch).not.toHaveBeenCalled();
  });
});
