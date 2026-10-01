import { afterEach, describe, expect, it, vi } from "vitest";
const cookie = vi.hoisted(() => ({ get: () => undefined }));
vi.mock("next/headers", () => ({ cookies: async () => cookie }));
vi.mock("@/lib/db/prisma", () => ({ getPrismaClient: () => ({}) }));
import { assertCustomerAuthOrigin } from "@/modules/customer-auth/origin";
import { emailPostHandler } from "@/modules/customer-auth/email-handler";
import { CustomerEmailService } from "@/modules/customer-auth/email-service";
import { CustomerEmailRepository } from "@/modules/customer-auth/email-repository";
function setup() {
  vi.stubEnv("NODE_ENV", "development"); vi.stubEnv("DATABASE_URL", "postgresql://local@127.0.0.1:55433/niuva_dev");
  vi.stubEnv("APP_URL", "http://127.0.0.1:3000"); vi.stubEnv("NIUVA_INTERNAL_AUTH_ENABLED", "true");
  vi.stubEnv("NIUVA_INTERNAL_GOOGLE_EMAIL", "google@example.test"); vi.stubEnv("NIUVA_INTERNAL_PASSWORD_EMAIL", "password@example.test");
  vi.stubEnv("NIUVA_CUSTOMER_AUTH_MOCK", "false"); vi.stubEnv("NIUVA_RUNTIME_MODE", "live");
}
function request(origin: string | null, host = "127.0.0.1:3000", json = false) {
  return new Request("http://localhost:3000/api/auth/email/login", { method: "POST", headers: { Host: host, ...(origin ? { Origin: origin } : {}), "Content-Type": "application/x-www-form-urlencoded", ...(json ? { Accept: "application/json" } : {}) }, body: "returnTo=%2Fcheckout" });
}
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe("internal external auth origin", () => {
  it("accepts trusted public Host despite Next localhost normalization, rejects foreign or missing origin and wrong Host", () => {
    setup(); expect(() => assertCustomerAuthOrigin(request("http://127.0.0.1:3000"))).not.toThrow();
    for (const req of [request(null), request("https://evil.test"), request("http://127.0.0.1:3000", "localhost:3000")]) expect(() => assertCustomerAuthOrigin(req)).toThrow();
  });
  it("keeps native and JS redirects on 127.0.0.1", async () => {
    setup(); const service = new CustomerEmailService(new CustomerEmailRepository(), null, null);
    vi.spyOn(service, "login").mockResolvedValue({ token: "TEST-ONLY", remember: false, maxAge: 86400, returnTo: "/checkout" });
    const native = await emailPostHandler("login", () => service)(request("http://127.0.0.1:3000"));
    expect(native.status).toBe(303); expect(native.headers.get("location")).toBe("http://127.0.0.1:3000/checkout");
    const js = await emailPostHandler("login", () => service)(request("http://127.0.0.1:3000", "127.0.0.1:3000", true));
    expect(await js.json()).toEqual({ destination: "/checkout" });
  });
});
