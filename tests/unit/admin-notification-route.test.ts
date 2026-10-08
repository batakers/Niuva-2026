import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/modules/shared/errors";

const mocks = vi.hoisted(() => ({ authorize: vi.fn(), bootstrap: vi.fn(), poll: vi.fn(), read: vi.fn() }));
vi.mock("@/lib/auth/admin", () => ({ requireAdmin: mocks.authorize }));
vi.mock("@/modules/admin/notifications/service", () => ({ AdminNotificationService: class { bootstrap = mocks.bootstrap; poll = mocks.poll; markRead = mocks.read; } }));
import { POST as feed } from "@/app/api/admin/notifications/route";
import { POST as read } from "@/app/api/admin/notifications/read/route";

const access = { authUserId: "test", profile: { id: "69946247-579b-4774-a704-5e805092f606", role: "ADMIN", isActive: true } };
function request(path: string, body: string, origin = "http://localhost:3000") { return new Request(`http://localhost:3000/api/admin/notifications${path}`, { method: "POST", headers: { origin, "content-type": "application/json" }, body }); }
beforeEach(() => {
  mocks.authorize.mockResolvedValue(access);
  mocks.bootstrap.mockResolvedValue({ items: [], unreadCount: 0, nextCursor: null, toastCandidates: [] });
  mocks.poll.mockResolvedValue({ items: [], unreadCount: 0, nextCursor: null, toastCandidates: [] });
});
describe("notification HTTP boundary", () => {
  it("ends disconnected feed requests without treating cancellation as a code defect", async () => {
    const controller = new AbortController(); controller.abort();
    const disconnected = new Request("http://localhost:3000/api/admin/notifications", { method: "POST", headers: { origin: "http://localhost:3000" }, body: '{"operation":"bootstrap"}', signal: controller.signal });
    const response = await feed(disconnected);
    expect(response.status).toBe(499);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("rejects foreign origins on both personal-state mutations", async () => {
    expect((await feed(request("", '{"operation":"bootstrap"}', "https://foreign.example.test"))).status).toBe(403);
    expect((await read(request("/read", '{"ids":[]}', "https://foreign.example.test"))).status).toBe(403);
  });
  it("requires authentication and never caches an auth failure", async () => {
    mocks.authorize.mockRejectedValue(new AppError("UNAUTHORIZED"));
    const response = await feed(request("", '{"operation":"bootstrap"}'));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("rejects malformed/oversized input and extra identity fields", async () => {
    expect((await feed(request("", "not json"))).status).toBe(400);
    expect((await feed(request("", JSON.stringify({ operation: "poll", profileId: access.profile.id })))).status).toBe(422);
    expect((await feed(request("", "x".repeat(9000)))).status).toBe(413);
  });
  it("returns a personal no-store feed for the authenticated profile", async () => {
    const response = await feed(request("", '{"operation":"bootstrap"}'));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("vary")).toBe("Cookie");
    expect(await response.json()).toEqual({ items: [], unreadCount: 0, nextCursor: null, toastCandidates: [] });
  });
});
