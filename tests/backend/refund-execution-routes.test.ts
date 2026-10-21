import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ admin: vi.fn(), rate: vi.fn(), submit: vi.fn(), reconcile: vi.fn(), authorize: vi.fn(), confirm: vi.fn(), revoke: vi.fn(), runtime: vi.fn(), run: vi.fn(), inspect: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/admin", () => ({ requireAdmin: mocks.admin }));
vi.mock("@/lib/db/prisma", () => ({ getPrismaClient: () => ({}) }));
vi.mock("@/lib/security/shared-rate-limit", () => ({ createRuntimeRateLimiter: () => ({ check: mocks.rate }) }));
vi.mock("@/modules/refund/execution-service", () => ({ RefundExecutionService: class { submit = mocks.submit; reconcile = mocks.reconcile; authorizeManual = mocks.authorize; confirmManual = mocks.confirm; revokeManual = mocks.revoke; } }));
vi.mock("@/modules/jobs/runtime", () => ({ createOperationalJobRuntime: mocks.runtime }));
import { POST } from "@/app/api/admin/orders/[id]/refund/execution/route";
import { GET as jobGet, POST as jobPost } from "@/app/api/internal/jobs/refund-reconciliation/route";
import { appError } from "@/modules/shared/errors";
const orderId = randomUUID(), context = { params: Promise.resolve({ id: orderId }) };
function request(body: unknown, origin = "http://localhost:3000", contentType = "application/json") { return new Request(`http://localhost:3000/api/admin/orders/${orderId}/refund/execution`, { method: "POST", headers: { origin, "content-type": contentType }, body: typeof body === "string" ? body : JSON.stringify(body) }); }
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("CRON_SECRET", "synthetic-cron-only");
  mocks.admin.mockResolvedValue({ profile: { id: randomUUID(), role: "OWNER", isActive: true } }); mocks.rate.mockResolvedValue({ allowed: true });
  mocks.runtime.mockReturnValue({ run: mocks.run, inspect: mocks.inspect }); mocks.run.mockResolvedValue({ state: "completed", counts: {} }); mocks.inspect.mockResolvedValue({ jobs: [] });
});
describe("refund submission and reconciliation HTTP boundaries", () => {
  it("revokes an unused manual authorization through the authenticated order path", async () => {
    const input = { authorizationId: randomUUID(), expectedVersion: 4, submissionKey: randomUUID(), reason: "Bukti provider berubah; persetujuan harus diperiksa ulang." };
    const response = await POST(request({ operation: "revoke-manual", input }), context);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.revoke).toHaveBeenCalledWith({ ...input, orderId });
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.submit).not.toHaveBeenCalled();
  });
  it("uses the authenticated server order path and private no-store", async () => {
    const input = { allocationId: randomUUID(), submissionKey: randomUUID(), expectedVersion: 2, publicReason: "Pengembalian penuh setelah pemeriksaan.", eligibilityEvidence: "TEST-MERCHANT-EVIDENCE" };
    const response = await POST(request({ operation: "submit", input }), context);
    expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("private, no-store"); expect(mocks.submit).toHaveBeenCalledWith({ ...input, orderId });
  });
  it("rejects foreign origin, anonymous, wrong content, malformed and oversized bodies before execution", async () => {
    expect((await POST(request({ operation: "reconcile", input: {} }, "https://foreign.example.test"), context)).status).toBe(403);
    mocks.admin.mockRejectedValueOnce(appError("UNAUTHORIZED")); expect((await POST(request({ operation: "reconcile", input: {} }), context)).status).toBe(401);
    expect((await POST(request("{"), context)).status).toBe(400);
    expect((await POST(request("x".repeat(5000)), context)).status).toBe(413);
    expect((await POST(request({}, undefined, "text/plain"), context)).status).toBe(422);
    expect(mocks.submit).not.toHaveBeenCalled(); expect(mocks.reconcile).not.toHaveBeenCalled();
  });
  it("does not accept another path ID, reconcile payload or missing shared actor allowance", async () => {
    expect((await POST(request({ operation: "submit", input: { orderId: randomUUID() } }), context)).status).toBe(422);
    expect((await POST(request({ operation: "reconcile", input: { providerUrl: "https://foreign.example.test" } }), context)).status).toBe(422);
    mocks.rate.mockResolvedValue({ allowed: false }); expect((await POST(request({ operation: "reconcile", input: {} }), context)).status).toBe(429); expect(mocks.reconcile).not.toHaveBeenCalled();
  });
  it("guards both job methods before constructing a runtime and requires explicit policy/lag", async () => {
    expect((await jobGet(new Request("http://localhost:3000/api/internal/jobs/refund-reconciliation"))).status).toBe(401);
    expect(mocks.runtime).not.toHaveBeenCalled();
    const headers = { authorization: "Bearer synthetic-cron-only", "content-type": "application/json" };
    expect((await jobGet(new Request("http://localhost:3000/api/internal/jobs/refund-reconciliation", { headers }))).status).toBe(422);
    const status = await jobGet(new Request("http://localhost:3000/api/internal/jobs/refund-reconciliation?maxLagMs=60000", { headers }));
    expect(status.status).toBe(200); expect(status.headers.get("Cache-Control")).toBe("no-store");
    const post = (body: unknown) => jobPost(new Request("http://localhost:3000/api/internal/jobs/refund-reconciliation", { method: "POST", headers, body: JSON.stringify(body) }));
    expect((await post({ mode: "execute", limit: 11, jobPolicy: { leaseMs: 30000, minIntervalMs: 0, failureCooldownMs: 1000 } })).status).toBe(422);
    expect((await post({ mode: "execute", limit: 1, jobPolicy: { leaseMs: 30000, minIntervalMs: 0, failureCooldownMs: 1000 } })).status).toBe(200);
    expect(mocks.run).toHaveBeenCalledWith({ job: "REFUND_RECONCILIATION", mode: "execute", limit: 1 }, { leaseMs: 30000, minIntervalMs: 0, failureCooldownMs: 1000 }, undefined);
    expect((await post({ mode: "execute", limit: 1 })).status).toBe(422);
  });
});
