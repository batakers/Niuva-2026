import { describe, expect, it, vi } from "vitest";
import { CustomerOutboxJobRunner } from "@/modules/outbox/job-runner";
import type { OperationalJobRuntime } from "@/modules/jobs/runtime";
import type { JobInspection } from "@/modules/jobs/monitoring";

const jobPolicy = { leaseMs: 60_000, minIntervalMs: 0, failureCooldownMs: 1000 };
const workerPolicy = { leaseMs: 10_000, sendTimeoutMs: 1000, retryDelaysMs: [1000] };
function fixture() {
  const inspection: JobInspection = { checkedAt: new Date(0).toISOString(), jobs: [], outbox: { pending: 0, leased: 0, failed: 0, unknown: 0, expiredPending: 0, staleLeases: 0, dueLagMs: 0 }, privacy: { overdue: 0, overdueHolds: 0 }, inventory: { remainingDue: 0, lagMs: 0 }, alarms: [] };
  const runtime = { run: vi.fn<OperationalJobRuntime["run"]>().mockResolvedValue({ job: "OUTBOX_DELIVERY", mode: "execute", state: "completed", counts: {} }), inspect: vi.fn<OperationalJobRuntime["inspect"]>().mockResolvedValue(inspection) };
  return { runtime, endpoint: new CustomerOutboxJobRunner({ runtime }) };
}
describe("OUTBOX_DELIVERY HTTP adapter to the canonical runner", () => {
  it("validates before constructing the runtime or accessing its resource", async () => {
    const { runtime } = fixture();
    const factory = vi.fn(() => runtime);
    const endpoint = new CustomerOutboxJobRunner({ runtime: factory });
    await expect(endpoint.run({ mode: "execute", limit: 1 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(endpoint.status({ maxLagMs: 0 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(factory).not.toHaveBeenCalled();
  });
  it("forwards validated work and policies to the shared runtime", async () => {
    const { runtime, endpoint } = fixture();
    await endpoint.run({ mode: "execute", limit: 2, jobPolicy, workerPolicy });
    expect(runtime.run).toHaveBeenCalledWith({ job: "OUTBOX_DELIVERY", mode: "execute", limit: 2 }, jobPolicy, workerPolicy);
  });
  it("preserves dry-run and uses shared inspection", async () => {
    const { runtime, endpoint } = fixture();
    await endpoint.run({ mode: "dry-run", limit: 1, jobPolicy, workerPolicy });
    expect(runtime.run.mock.calls[0][0].mode).toBe("dry-run");
    await endpoint.status({ maxLagMs: 5000 });
    expect(runtime.inspect).toHaveBeenCalledWith({ maxLagMs: 5000 });
  });
  it("rejects missing or invalid policy, unsafe limits and unknown fields before execution", async () => {
    const { runtime, endpoint } = fixture();
    for (const input of [{ mode: "execute", limit: 1 }, { mode: "execute", limit: 101, jobPolicy, workerPolicy }, { mode: "execute", limit: 1, jobPolicy, extra: "private", workerPolicy }]) {
      await expect(endpoint.run(input)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    }
    expect(runtime.run).not.toHaveBeenCalled();
    await expect(endpoint.status({ maxLagMs: 0 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
});
