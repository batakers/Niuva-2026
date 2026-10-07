import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { handleAcceptAdminInvitation } from "@/modules/admin-auth/invitation-handler";
import { withAdminAuthOrigin } from "@/modules/admin-auth/request-origin";

const origin = "http://localhost:3000";
function request(body: string, extra: Record<string, string> = {}) {
  return new Request(`${origin}/api/admin/auth/accept-invitation`, { method: "POST", headers: { origin, "Content-Type": "application/json", "x-real-ip": randomUUID(), ...extra }, body });
}
describe("Admin invitation acceptance HTTP boundary", () => {
  it("accepts the configured public origin over an internal listener URL and still rejects foreign origins", async () => {
    const publicOrigin = "http://127.0.0.1:3000";
    const accept = vi.fn().mockResolvedValue(undefined);
    const response = await handleAcceptAdminInvitation(withAdminAuthOrigin(request("{}", { origin: publicOrigin }), publicOrigin), { accept });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    const foreign = await handleAcceptAdminInvitation(withAdminAuthOrigin(request("{}", { origin: "https://outside.example" }), publicOrigin), { accept });
    expect(foreign.status).toBe(403);
    expect(accept).toHaveBeenCalledOnce();
  });
  it("rejects cross-origin, non-JSON and oversized bodies before service access", async () => {
    const accept = vi.fn();
    expect((await handleAcceptAdminInvitation(request("{}", { origin: "https://outside.example" }), { accept })).status).toBe(403);
    expect((await handleAcceptAdminInvitation(request("{}", { "Content-Type": "text/plain" }), { accept })).status).toBe(422);
    expect((await handleAcceptAdminInvitation(request("x".repeat(4097)), { accept })).status).toBe(413);
    expect(accept).not.toHaveBeenCalled();
  });
  it("accepts a bounded request without creating or returning a session", async () => {
    const accept = vi.fn().mockResolvedValue(undefined);
    const response = await handleAcceptAdminInvitation(request('{"token":"fixture","password":"fixture"}'), { accept });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ success: true });
  });
  it("throttles repeated activation attempts", async () => {
    const accept = vi.fn().mockResolvedValue(undefined);
    const headers = { "x-real-ip": randomUUID() };
    for (let index = 0; index < 5; index++) expect((await handleAcceptAdminInvitation(request("{}", headers), { accept })).status).toBe(200);
    expect((await handleAcceptAdminInvitation(request("{}", headers), { accept })).status).toBe(429);
    expect(accept).toHaveBeenCalledTimes(5);
  });
});
