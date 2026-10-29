import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ run: vi.fn(), inspect: vi.fn(), client: vi.fn(() => ({})) }));
vi.mock("@/lib/db/prisma", () => ({ getPrismaClient: state.client }));
vi.mock("@/modules/jobs/runtime", () => ({ createOperationalJobRuntime: () => ({ run: state.run, inspect: state.inspect }) }));
vi.mock("@/lib/observability/persistent-logger", () => ({ createPersistentFailureLogger: () => ({ record: () => {} }) }));
import { GET, POST } from "@/app/api/internal/jobs/business-notifications/route";
import { executeJobCli } from "@/modules/jobs/cli";
const secret = "synthetic-business-cron-secret-000000000000";
const jobPolicy = { leaseMs: 60000, minIntervalMs: 0, failureCooldownMs: 1000 }, businessPolicy = { maxAgeMs: 3600000, runBudgetMs: 15000 };
function request(data: unknown, authorized = true, type = "application/json") {
  return new Request("http://127.0.0.1:3000/api/internal/jobs/business-notifications", { method: "POST", headers: { "content-type": type, ...(authorized ? { authorization: `Bearer ${secret}` } : {}) }, body: typeof data === "string" ? data : JSON.stringify(data) });
}
beforeEach(() => { vi.stubEnv("CRON_SECRET", secret); vi.clearAllMocks(); state.run.mockResolvedValue({ job: "OUTBOX_BUSINESS", mode: "execute", state: "completed", counts: { scanned: 0 } }); state.inspect.mockResolvedValue({ jobs: [], alarms: [] }); });
afterEach(() => { vi.unstubAllEnvs(); });
describe("business notification canonical job adapters", () => {
  it("denies missing authorization/configuration before reading the body or creating a runtime", async () => {
    expect((await POST(request("invalid JSON", false))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", ""); expect((await POST(request({}))).status).toBe(503);
    expect(state.client).not.toHaveBeenCalled(); expect(state.run).not.toHaveBeenCalled();
  });
  it("requires an explicit lifetime policy and bounded strict body without auth tokens or recipient overrides", async () => {
    const valid = { mode: "execute", limit: 10, jobPolicy, businessPolicy };
    expect((await POST(request(JSON.stringify(valid), true, "text/plain"))).status).toBe(422);
    expect((await POST(request("x".repeat(4097)))).status).toBe(413);
    for (const data of [{ ...valid, limit: 11 }, { ...valid, businessPolicy: undefined }, { ...valid, businessPolicy: {} }, { ...valid, businessPolicy: { maxAgeMs: businessPolicy.maxAgeMs } }, { ...valid, businessPolicy: { ...businessPolicy, runBudgetMs: 20001 } }, { ...valid, token: "forged" }, { ...valid, to: "foreign@example.test" }, { ...valid, workerPolicy: {} }]) expect((await POST(request(data))).status).toBe(422);
    expect(state.run).not.toHaveBeenCalled();
  });
  it("forwards explicit policy and keeps run/status uncached", async () => {
    const response = await POST(request({ mode: "execute", limit: 2, jobPolicy, businessPolicy }));
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    expect(state.run).toHaveBeenCalledWith({ job: "OUTBOX_BUSINESS", mode: "execute", limit: 2 }, jobPolicy, businessPolicy);
    const status = await GET(new Request("http://127.0.0.1:3000/api/internal/jobs/business-notifications?maxLagMs=1000", { headers: { authorization: `Bearer ${secret}` } }));
    expect(status.status).toBe(200); expect(status.headers.get("cache-control")).toBe("no-store");
    expect((await GET(new Request("http://127.0.0.1:3000/api/internal/jobs/business-notifications"))).status).toBe(401);
  });
  it("CLI validates business policy before runtime creation and uses the same runner contract", async () => {
    const factory = vi.fn(() => ({ run: state.run, inspect: state.inspect })), input = JSON.stringify({ job: "OUTBOX_BUSINESS", mode: "execute", limit: 2 });
    expect((await executeJobCli(["run", input, JSON.stringify(jobPolicy)], factory)).exitCode).toBe(1); expect(factory).not.toHaveBeenCalled();
    expect((await executeJobCli(["run", input, JSON.stringify(jobPolicy), JSON.stringify(businessPolicy)], factory)).exitCode).toBe(0);
    expect(state.run).toHaveBeenCalledWith({ job: "OUTBOX_BUSINESS", mode: "execute", limit: 2 }, jobPolicy, businessPolicy);
  });
});
