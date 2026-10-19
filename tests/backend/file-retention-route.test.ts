import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ prisma: vi.fn(), createRuntime: vi.fn(), run: vi.fn(), inspect: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ getPrismaClient: mocks.prisma }));
vi.mock("@/modules/jobs/runtime", () => ({ createOperationalJobRuntime: mocks.createRuntime }));
import { GET, POST } from "@/app/api/internal/jobs/customer-file-retention/route";

const jobPolicy = { leaseMs: 60000, minIntervalMs: 0, failureCooldownMs: 1000 };
function request(body: unknown, authorized = true) {
  return new Request("http://127.0.0.1/api/internal/jobs/customer-file-retention", { method: "POST",
    headers: { "Content-Type": "application/json", ...(authorized ? { Authorization: "Bearer synthetic-job-test" } : {}) }, body: JSON.stringify(body) });
}
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });
describe("private file retention job HTTP boundary", () => {
  it("rejects anonymous calls and missing configuration before accessing a database", async () => {
    vi.stubEnv("CRON_SECRET", "synthetic-job-test");
    expect((await POST(request({}, false))).status).toBe(401);
    vi.stubEnv("CRON_SECRET", "");
    expect((await POST(request({}))).status).toBe(503);
    expect(mocks.prisma).not.toHaveBeenCalled(); expect(mocks.createRuntime).not.toHaveBeenCalled();
  });
  it("validates policies, batch limit and inspection parameters before building runtime", async () => {
    vi.stubEnv("CRON_SECRET", "synthetic-job-test");
    for (const body of [{ mode: "execute", limit: 1 }, { mode: "execute", limit: 11, jobPolicy }, { mode: "execute", limit: 101, jobPolicy }, { mode: "execute", limit: 1, jobPolicy, workerPolicy: {} }]) {
      expect((await POST(request(body))).status).toBe(422);
    }
    expect((await GET(new Request("http://127.0.0.1/api/internal/jobs/customer-file-retention?maxLagMs=0", { headers: { Authorization: "Bearer synthetic-job-test" } }))).status).toBe(422);
    expect(mocks.createRuntime).not.toHaveBeenCalled();
  });
  it("dispatches an authorized dry-run to the same canonical runner with no-store", async () => {
    vi.stubEnv("CRON_SECRET", "synthetic-job-test");
    mocks.createRuntime.mockReturnValue({ run: mocks.run, inspect: mocks.inspect });
    mocks.run.mockResolvedValue({ job: "CUSTOMER_FILE_RETENTION", mode: "dry-run", state: "completed", counts: { scanned: 1, eligible: 1, deleted: 0 } });
    const response = await POST(request({ mode: "dry-run", limit: 1, jobPolicy }));
    expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(mocks.run).toHaveBeenCalledWith({ job: "CUSTOMER_FILE_RETENTION", mode: "dry-run", limit: 1 }, jobPolicy, undefined);
  });
});
