import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ cookies: new Map<string, string>() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => mocks.cookies.has(name) ? { value: mocks.cookies.get(name) } : undefined }) }));
vi.mock("@/lib/db/prisma", () => ({ getPrismaClient: () => ({}) }));
import { CustomerEmailService } from "@/modules/customer-auth/email-service";
import { CustomerEmailRepository } from "@/modules/customer-auth/email-repository";
import { emailPostHandler, PENDING_REGISTRATION_COOKIE } from "@/modules/customer-auth/email-handler";
const service = new CustomerEmailService(new CustomerEmailRepository(), null, null);
function request(action: string, input: Record<string, string> = {}, json = true) {
  return new Request(`https://app.example.test/api/auth/email/${action}`, { method: "POST", headers: { Origin: "https://app.example.test", "Content-Type": "application/x-www-form-urlencoded", ...(json ? { Accept: "application/json" } : {}) }, body: new URLSearchParams(input) });
}
beforeEach(() => { vi.restoreAllMocks(); mocks.cookies.clear(); });
describe("Customer email auth POST boundaries", () => {
  it("rejects cross-origin POST before invoking the service", async () => {
    const factory = vi.fn(() => service);
    const response = await emailPostHandler("login", factory)(new Request("https://app.example.test/api/auth/email/login", { method: "POST", headers: { Origin: "https://evil.test", Accept: "application/json" }, body: "email=x" }));
    expect(response.status).toBe(403); expect(factory).not.toHaveBeenCalled();
  });
  it("bounds actual request bytes without trusting Content-Length", async () => {
    const factory = vi.fn(() => service);
    const response = await emailPostHandler("login", factory)(request("login", { email: "x".repeat(9000) }));
    expect(response.status).toBe(413); expect(factory).not.toHaveBeenCalled();
  });
  it("native forms redirect safely with 303 and use a browser-session cookie", async () => {
    vi.spyOn(service, "login").mockResolvedValue({ token: "TEST-SESSION-TOKEN", remember: false, maxAge: 86400, returnTo: "/account" });
    const response = await emailPostHandler("login", () => service)(request("login", { returnTo: "https://evil.test" }, false));
    expect(response.status).toBe(303); expect(response.headers.get("location")).toBe("https://app.example.test/account");
    expect(response.headers.get("set-cookie")).toContain("HttpOnly");
    expect(response.headers.get("set-cookie")).not.toContain("Max-Age");
  });
  it("remember me emits a persistent cookie", async () => {
    vi.spyOn(service, "login").mockResolvedValue({ token: "TEST-SESSION-TOKEN", remember: true, maxAge: 2592000, returnTo: "/account" });
    const response = await emailPostHandler("login", () => service)(request("login"));
    expect(response.headers.get("set-cookie")).toContain("Max-Age=2592000");
  });
  it("preserves pending handle on delivery failure without claiming delivery", async () => {
    vi.spyOn(service, "register").mockResolvedValue({ handle: "TEST-PENDING-HANDLE", sent: false });
    const response = await emailPostHandler("register", () => service)(request("register"));
    expect(response.headers.get("set-cookie")).toContain(PENDING_REGISTRATION_COOKIE);
    expect((await response.json()).destination).toContain("status=delivery_failed");
  });
  it("reset clears the browser session and returns to login", async () => {
    vi.spyOn(service, "reset").mockResolvedValue("/checkout");
    const response = await emailPostHandler("reset-password", () => service)(request("reset-password", { token: "x".repeat(43) }));
    expect((await response.json()).destination).toContain("/login?returnTo=%2Fcheckout");
    expect(response.headers.get("set-cookie")).toContain("niuva_customer_session=;");
  });
  it("forgot-password has the same public response regardless of account", async () => {
    vi.spyOn(service, "forgot").mockResolvedValue(undefined);
    const first = await emailPostHandler("forgot-password", () => service)(request("forgot-password", { email: "exists@example.test" }));
    const second = await emailPostHandler("forgot-password", () => service)(request("forgot-password", { email: "missing@example.test" }));
    expect(await first.json()).toEqual(await second.json());
  });
});
