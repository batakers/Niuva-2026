import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ cookies: new Map<string, string>(), customer: { id: "fixture-customer" }, access: { authUserId: "test-owner", profile: { id: "00000000-0000-4000-8000-000000000001", role: "OWNER", isActive: true } } }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => ({ value: state.cookies.get(name) }) }) }));
vi.mock("@/lib/auth/customer", () => ({ requireCustomer: async () => state.customer }));
vi.mock("@/lib/auth/admin", () => ({ requireAdmin: async () => state.access }));
vi.mock("@/lib/db/prisma", () => ({ getPrismaClient: () => ({}) }));
import { CustomerPrivacyRepository } from "@/modules/customer-privacy/repository";
import { CustomerPrivacyService } from "@/modules/customer-privacy/service";
import { privacyPostHandler, assertPrivacyOrigin } from "@/modules/customer-privacy/handler";
import { appError } from "@/modules/shared/errors";
const service = new CustomerPrivacyService(new CustomerPrivacyRepository(), null, () => new Date(), () => {});
function request(action: string, raw: Record<string, string> = {}, json = true, headers: Record<string, string> = {}) {
  return new Request(`http://127.0.0.1:3000/api/account/privacy/${action}`, { method: "POST", headers: { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000", "content-type": "application/x-www-form-urlencoded", ...(json ? { accept: "application/json" } : {}), ...headers }, body: new URLSearchParams(raw) });
}
beforeEach(() => { vi.restoreAllMocks(); state.cookies.set("niuva_customer_session", "x".repeat(43)); state.access.profile.role = "OWNER"; });
describe("privacy HTTP boundaries", () => {
  it.each([true, false])("Owner detail preserves the internal response path for JSON=%s", async json => {
    const id = "7614b2eb-6e0c-4a27-9162-e94fb377ebd4";
    vi.spyOn(service, "handle").mockResolvedValue({ id, referenceNumber: "PRV-FIXTURE", status: "IN_REVIEW", submissionKey: id, kind: "ADDITIONAL", customerId: null, details: null, correction: null, contactEmail: null, response: "Synthetic response", outcome: null, createdAt: new Date(), dueAt: new Date(), resolvedAt: null, contentDeleteAt: null, receiptDeleteAt: null, contentPurgedAt: null, handledBy: null, holdCategory: null, holdReason: null, holdOwnerId: null, holdReviewAt: null });
    const response = await privacyPostHandler("owner", () => service)(request("owner", { id, responseView: "detail", returnTo: "/admin/privacy?status=OPEN&page=2" }, json));
    const destination = json ? (await response.json() as { url: string }).url : response.headers.get("location")!;
    expect(response.status).toBe(json ? 200 : 303);
    const url = new URL(destination, "http://127.0.0.1:3000");
    expect(url.pathname).toBe(`/admin/privacy/${id}`);
    expect(url.searchParams.get("returnTo")).toBe("/admin/privacy?status=OPEN&page=2");
    expect(url.searchParams.get("status")).toBe("updated");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("builds Owner error responses from UUID and view while ignoring forged paths", async () => {
    const id = "7614b2eb-6e0c-4a27-9162-e94fb377ebd4";
    vi.spyOn(service, "handle").mockRejectedValue(appError("VALIDATION_ERROR", { details: { response: "Periksa tanggapan." } }));
    const response = await privacyPostHandler("owner", () => service)(request("owner", { id, responseView: "detail", returnTo: "//evil.test/admin", responsePath: "https://evil.test", response: "PRIVATE-CONTENT" }, false));
    const url = new URL(response.headers.get("location")!);
    expect(url.pathname).toBe(`/admin/privacy/${id}`);
    expect(url.searchParams.get("returnTo")).toBe("/admin/privacy");
    expect(url.searchParams.get("form")).toBe(id);
    expect(url.href).not.toContain("evil.test"); expect(url.href).not.toContain("PRIVATE-CONTENT");
  });
  it("rejects foreign, missing origin and mismatched Host before reading data; forwarded headers do not confer trust", async () => {
    const factory = vi.fn(() => service);
    const invalidHeaders: Record<string, string>[] = [{ origin: "https://evil.test" }, { origin: "" }, { host: "localhost:3000" }, { host: "evil.test", "x-forwarded-host": "127.0.0.1:3000", "x-forwarded-proto": "http" }];
    for (const headers of invalidHeaders) {
      const response = await privacyPostHandler("request", factory)(request("requests", {}, true, headers)); expect(response.status).toBe(403);
    }
    expect(factory).not.toHaveBeenCalled(); expect(() => assertPrivacyOrigin(request("requests"))).not.toThrow();
  });
  it("bounds bytes and checks Customer session", async () => {
    const factory = vi.fn(() => service);
    expect((await privacyPostHandler("request", factory)(request("requests", { details: "x".repeat(17000) }))).status).toBe(413); expect(factory).not.toHaveBeenCalled();
    state.cookies.clear(); expect((await privacyPostHandler("email", factory)(request("confirmation-email"))).status).toBe(401);
  });
  it("native forms use 303 and failed validation links error fields without echoing data", async () => {
    vi.spyOn(service, "request").mockRejectedValue(appError("VALIDATION_ERROR", { details: { details: "Jelaskan data yang salah." } }));
    const response = await privacyPostHandler("request", () => service)(request("requests", { details: "PRIVATE-CONTENT" }, false));
    expect(response.status).toBe(303); const location = new URL(response.headers.get("location")!); expect(location.pathname).toBe("/account/privacy"); expect(location.searchParams.get("fields")).toContain("details"); expect(location.href).not.toContain("PRIVATE-CONTENT");
  });
  it("exports only through POST service completion as a non-cacheable attachment", async () => {
    vi.spyOn(service, "complete").mockResolvedValue({ purpose: "EXPORT", data: { schemaVersion: "niuva.customer-data.v1", generatedAt: new Date().toISOString(), scope: "test", profile: { id: "fixture-customer", email: "fixture@example.test", googleSubject: null, internalTestExpiresAt: null, emailVerifiedAt: null, displayName: null, avatarUrl: null, createdAt: new Date(), consents: [] }, orders: [], inquiries: [], customPrint: [], files: [], privacyRequests: [] } });
    const response = await privacyPostHandler("export", () => service)(request("export", { token: "y".repeat(43) }));
    expect(response.status).toBe(200); expect(response.headers.get("content-disposition")).toContain("attachment"); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(service.complete).toHaveBeenCalledWith({ customerId: "fixture-customer", sessionHash: expect.any(String) }, expect.objectContaining({ purpose: "EXPORT" }));
  });
  it("successful closure clears the session and redirects; provider failure never claims delivery", async () => {
    vi.spyOn(service, "complete").mockResolvedValue({ purpose: "CLOSE", data: null });
    const response = await privacyPostHandler("close", () => service)(request("close", { token: "y".repeat(43), permanent: "on" }));
    expect(response.status).toBe(303); expect(response.headers.get("location")).toContain("/account/privacy/closed"); expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    vi.spyOn(service, "sendConfirmation").mockRejectedValue(appError("PROVIDER_UNAVAILABLE"));
    const failed = await privacyPostHandler("email", () => service)(request("confirmation-email", { purpose: "EXPORT" }));
    expect(failed.status).toBe(503); expect(await failed.json()).toMatchObject({ ok: false, code: "PROVIDER_UNAVAILABLE" });
  });
  it("ordinary Admin is rejected by the Owner service boundary", async () => {
    state.access.profile.role = "ADMIN";
    const response = await privacyPostHandler("owner", () => service)(request("owner")); expect(response.status).toBe(403);
  });
});
