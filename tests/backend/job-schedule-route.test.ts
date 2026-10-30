import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ run: vi.fn(), inspect: vi.fn(), client: vi.fn(() => ({})), runtime: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ getPrismaClient: state.client }));
vi.mock("@/modules/jobs/runtime", () => ({ createOperationalJobRuntime: (...args: unknown[]) => { state.runtime(...args); return { run: state.run, inspect: state.inspect }; } }));
vi.mock("@/lib/observability/persistent-logger", () => ({ createPersistentFailureLogger: () => ({ record: () => {} }) }));
import { POST } from "@/app/api/internal/jobs/schedule/route";
import { JOB_SCHEDULES, type JobSchedule } from "@/modules/jobs/schedule";
const secret = "synthetic-cron-secret-00000000000000000000";
function request(data: unknown = {}, authorized = true, type = "application/json") {
  return new Request("http://127.0.0.1:3000/api/internal/jobs/schedule", { method: "POST", headers: { "content-type": type, ...(authorized ? { authorization: `Bearer ${secret}` } : {}) }, body: typeof data === "string" ? data : JSON.stringify(data) });
}
beforeEach(() => {
  vi.stubEnv("CRON_SECRET", secret); vi.stubEnv("NIUVA_DEPLOYMENT_TIER", "production"); vi.clearAllMocks();
  state.run.mockImplementation(async (job: { job: string; mode: string }) => ({ job: job.job, mode: job.mode, state: "cooldown", cooldownMs: 1000, counts: {} }));
  state.inspect.mockResolvedValue({ alarms: [{ code: "JOB_NEVER_RUN", job: "REFUND_RECONCILIATION" }] });
});
afterEach(() => { vi.unstubAllEnvs(); });
describe("job schedule internal HTTP boundary", () => {
  it("requires a configured bearer secret before parsing or constructing a runtime", async () => {
    expect((await POST(request("invalid JSON", false))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", ""); expect((await POST(request())).status).toBe(503);
    expect(state.runtime).not.toHaveBeenCalled(); expect(state.run).not.toHaveBeenCalled();
  });
  it("accepts only an empty JSON object, so callers cannot choose jobs, limits or policies", async () => {
    expect((await POST(request("{}", true, "text/plain"))).status).toBe(422);
    expect((await POST(request("x".repeat(65)))).status).toBe(413);
    for (const data of [{ job: "OUTBOX_DELIVERY" }, { limit: 100 }, { jobPolicy: {} }, []]) expect((await POST(request(data))).status).toBe(422);
    expect(state.runtime).not.toHaveBeenCalled();
  });
  it("refuses tiers without a reviewed schedule before creating a runtime", async () => {
    for (const tier of ["staging", "local-test", ""]) {
      vi.stubEnv("NIUVA_DEPLOYMENT_TIER", tier);
      expect((await POST(request())).status).toBe(503);
    }
    expect(state.runtime).not.toHaveBeenCalled();
  });
  it("runs one tick of the production schedule and does not cache the result", async () => {
    const response = await POST(request());
    expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
    const production = JOB_SCHEDULES.production as JobSchedule;
    expect(state.run.mock.calls.map(([job]) => job.job)).toEqual(production.entries.map(entry => entry.job));
    expect(state.inspect).toHaveBeenCalledWith({ maxLagMs: production.inspection.maxLagMs });
    const body = await response.json() as { jobs: { state: string }[]; inspection: string; alarms: unknown[] };
    expect(body).toMatchObject({ inspection: "ok", alarms: [{ code: "JOB_NEVER_RUN", job: "REFUND_RECONCILIATION" }] });
    expect(body.jobs.every(job => job.state === "cooldown")).toBe(true);
  });
});
