import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ run: vi.fn(), inspect: vi.fn(), client: vi.fn(() => ({})) }));
vi.mock("@/lib/db/prisma", () => ({ getPrismaClient: state.client }));
vi.mock("@/modules/jobs/runtime", () => ({ createOperationalJobRuntime: () => ({ run: state.run, inspect: state.inspect }) }));
vi.mock("@/lib/observability/persistent-logger", () => ({ createPersistentFailureLogger: () => ({ record: () => {} }) }));
import { GET, POST } from "@/app/api/internal/jobs/payment-reconciliation/route";
const secret = "synthetic-cron-secret-00000000000000000000";
const jobPolicy = { leaseMs: 60000, minIntervalMs: 0, failureCooldownMs: 1000 };
function request(data: unknown, authorized = true, type = "application/json") {
  return new Request("http://127.0.0.1:3000/api/internal/jobs/payment-reconciliation", { method: "POST", headers: { "content-type": type, ...(authorized ? { authorization: `Bearer ${secret}` } : {}) }, body: typeof data === "string" ? data : JSON.stringify(data) });
}
beforeEach(() => { vi.stubEnv("CRON_SECRET", secret); vi.clearAllMocks(); state.run.mockResolvedValue({ job: "PAYMENT_RECONCILIATION", mode: "execute", state: "completed", counts: { scanned: 0 } }); state.inspect.mockResolvedValue({ jobs: [], alarms: [] }); });
afterEach(() => { vi.unstubAllEnvs(); });
describe("payment reconciliation internal HTTP boundary", () => {
  it("requires a configured bearer secret before parsing or constructing a runtime", async () => {
    expect((await POST(request("invalid JSON", false))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", ""); expect((await POST(request({}))).status).toBe(503);
    expect(state.client).not.toHaveBeenCalled(); expect(state.run).not.toHaveBeenCalled();
  });
  it("validates content type, body bytes, policy, limit and extra actor/payment fields", async () => {
    const valid = { mode: "execute", limit: 10, jobPolicy };
    expect((await POST(request(JSON.stringify(valid), true, "text/plain"))).status).toBe(422);
    expect((await POST(request("x".repeat(4097)))).status).toBe(413);
    for (const data of [{ ...valid, limit: 11 }, { ...valid, jobPolicy: {} }, { ...valid, orderId: "forged" }, { ...valid, workerPolicy: {} }]) expect((await POST(request(data))).status).toBe(422);
    expect(state.run).not.toHaveBeenCalled();
  });
  it("uses the canonical runner with explicit policy and does not cache status or results", async () => {
    const response = await POST(request({ mode: "execute", limit: 2, jobPolicy }));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(state.run).toHaveBeenCalledWith({ job: "PAYMENT_RECONCILIATION", mode: "execute", limit: 2 }, jobPolicy, undefined);
    const status = await GET(new Request("http://127.0.0.1:3000/api/internal/jobs/payment-reconciliation?maxLagMs=1000", { headers: { authorization: `Bearer ${secret}` } }));
    expect(status.status).toBe(200); expect(status.headers.get("cache-control")).toBe("no-store"); expect(state.inspect).toHaveBeenCalledWith({ maxLagMs: 1000 });
  });
  it("requires explicit monitoring lag and refuses anonymous inspection", async () => {
    expect((await GET(new Request("http://127.0.0.1:3000/api/internal/jobs/payment-reconciliation"))).status).toBe(401);
    expect((await GET(new Request("http://127.0.0.1:3000/api/internal/jobs/payment-reconciliation", { headers: { authorization: `Bearer ${secret}` } }))).status).toBe(422);
    expect(state.inspect).not.toHaveBeenCalled();
  });
});
