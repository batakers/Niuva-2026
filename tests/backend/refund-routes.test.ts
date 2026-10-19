import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ customer: vi.fn(), admin: vi.fn(), request: vi.fn(), customerOrder: vi.fn(), adminOrder: vi.fn(), intake: vi.fn(), approve: vi.fn(), refresh: vi.fn(), receiveReturn: vi.fn(), rate: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/customer", () => ({ requireCustomer: mocks.customer }));
vi.mock("@/lib/auth/admin", () => ({ requireAdmin: mocks.admin }));
vi.mock("@/lib/security/shared-rate-limit", () => ({ createRuntimeRateLimiter: () => ({ check: mocks.rate }) }));
vi.mock("@/modules/refund/service", () => ({ RefundService: class { request = mocks.request; customerOrder = mocks.customerOrder; adminOrder = mocks.adminOrder; intake = mocks.intake; approve = mocks.approve; refresh = mocks.refresh; receiveReturn = mocks.receiveReturn; } }));
import { GET, POST } from "@/app/api/account/orders/[id]/refund/route";
import { POST as adminPost } from "@/app/api/admin/orders/[id]/refund/route";
import { appError } from "@/modules/shared/errors";
const orderId = randomUUID(), customerId = randomUUID(), context = { params: Promise.resolve({ id: orderId }) };
const body = () => ({ submissionKey: randomUUID(), category: "ITEM_ISSUE", reason: "Barang yang diterima tidak sesuai dengan pesanan." });
const request = (input: unknown, origin = "http://localhost:3000", contentType = "application/json") => new Request(`http://localhost:3000/api/account/orders/${orderId}/refund`, { method: "POST", headers: { origin, "Content-Type": contentType }, body: typeof input === "string" ? input : JSON.stringify(input) });
beforeEach(() => {
  vi.clearAllMocks(); mocks.customer.mockResolvedValue({ id: customerId }); mocks.admin.mockResolvedValue({ profile: { id: randomUUID(), role: "OWNER" } });
  mocks.rate.mockResolvedValue({ allowed: true }); mocks.request.mockResolvedValue({ id: randomUUID(), status: "REQUESTED" }); mocks.customerOrder.mockResolvedValue({ orderId }); mocks.approve.mockResolvedValue({ status: "APPROVED" });
});
describe("refund HTTP boundaries", () => {
  it("binds the order path and authenticated Customer, with no-store", async () => {
    const input = body(), response = await POST(request(input), context);
    expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.request).toHaveBeenCalledWith(customerId, { ...input, orderId });
    expect((await GET(new Request("http://localhost:3000"), context)).headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.customerOrder).toHaveBeenCalledWith(customerId, orderId);
  });
  it("rejects foreign origins and missing authentication before a business write", async () => {
    expect((await POST(request(body(), "https://foreign.example.test"), context)).status).toBe(403);
    mocks.customer.mockRejectedValue(appError("UNAUTHORIZED"));
    const response = await POST(request(body()), context);
    expect(response.status).toBe(401); expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("rejects client money/order identifiers, malformed JSON, unsupported content and oversized input", async () => {
    for (const input of [{ ...body(), amountRp: "1" }, { ...body(), orderId: randomUUID() }]) expect((await POST(request(input), context)).status).toBe(422);
    expect((await POST(request("{"), context)).status).toBe(400);
    expect((await POST(request(body(), undefined, "text/plain"), context)).status).toBe(422);
    expect((await POST(request("x".repeat(5000)), context)).status).toBe(413);
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("applies shared actor throttling before reading the request body", async () => {
    mocks.rate.mockResolvedValue({ allowed: false, retryAfterSeconds: 10 });
    const response = await POST(request(body()), context);
    expect(response.status).toBe(429); expect(response.headers.get("Retry-After")).toBe("10"); expect(mocks.request).not.toHaveBeenCalled();
  });
  it("keeps Owner approval behind the Admin session and server path", async () => {
    const input = { expectedVersion: 1, submissionKey: randomUUID(), reason: "Owner sudah memeriksa semua bukti transaksi.", returnState: "NOT_REQUIRED" };
    const response = await adminPost(request({ operation: "approve", input }), context);
    expect(response.status).toBe(200); expect(mocks.admin).toHaveBeenCalled(); expect(mocks.approve).toHaveBeenCalledWith({ ...input, orderId });
    expect((await adminPost(request({ operation: "approve", input: { ...input, orderId: randomUUID() } }), context)).status).toBe(422);
    mocks.admin.mockRejectedValue(appError("UNAUTHORIZED"));
    expect((await adminPost(request({ operation: "approve", input }), context)).status).toBe(401);
    expect(mocks.approve).toHaveBeenCalledTimes(1);
  });
});
