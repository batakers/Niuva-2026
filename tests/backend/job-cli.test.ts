import { describe, expect, it, vi } from "vitest";
import { executeJobCli } from "@/modules/jobs/cli";
import type { OperationalJobRuntime } from "@/modules/jobs/runtime";
import { appError } from "@/modules/shared/errors";

const request = JSON.stringify({ job: "OUTBOX_EXPIRY", mode: "dry-run", limit: 10 });
const policy = JSON.stringify({ leaseMs: 60000, minIntervalMs: 0, failureCooldownMs: 1000 });
function fixture() {
  const runtime: OperationalJobRuntime = { async run(value) { return { job: value.job, mode: value.mode, state: "completed", counts: { expired: 0 } }; }, async inspect() { return { checkedAt: "2026-10-14T00:00:00.000Z", jobs: [], outbox: { pending: 0, leased: 0, failed: 0, unknown: 0, expiredPending: 0, staleLeases: 0, dueLagMs: 0 }, privacy: { overdue: 0, overdueHolds: 0 }, inventory: { remainingDue: 0, lagMs: 0 }, files: { pendingDeletion: 0, failedDeletion: 0, held: 0, overdueHolds: 0, oldestPendingLagMs: 0 }, alarms: [] }; } };
  return { runtime, factory: vi.fn(() => runtime) };
}
describe("operational job CLI", () => {
  it("validates all arguments before creating a runtime", async () => {
    const { factory } = fixture();
    for (const args of [[], ["run", "sensitive-token", policy], ["run", request], ["inspect", '{"maxLagMs":0}'], ["inspect", '{"maxLagMs":1000,"role":"admin"}'], ["run", request, policy, "extra", "extra"]]) {
      const result = await executeJobCli(args, factory); expect(result.exitCode).toBe(1); expect(JSON.stringify(result.output)).not.toMatch(/sensitive-token|admin/);
    }
    expect(factory).not.toHaveBeenCalled();
  });
  it("runs a bounded dry-run and emits only the summary", async () => { const { factory } = fixture(); expect(await executeJobCli(["run", request, policy], factory)).toMatchObject({ exitCode: 0, output: { state: "completed", counts: { expired: 0 } } }); });
  it("requires explicit worker policy for delivery", async () => { const { factory } = fixture(); expect((await executeJobCli(["run", '{"job":"OUTBOX_DELIVERY","mode":"execute","limit":1}', policy], factory)).exitCode).toBe(1); expect(factory).not.toHaveBeenCalled(); });
  it("does not echo runtime errors or configuration", async () => { expect(await executeJobCli(["run", request, policy], () => { throw appError("PROVIDER_UNAVAILABLE", { message: "private@example.test secret-key" }); })).toEqual({ exitCode: 1, output: { status: "failed", category: "JOB_UNAVAILABLE" } }); });
  it("reports actionable inspection alarms with exit 2", async () => { const { runtime, factory } = fixture(), inspect = runtime.inspect; runtime.inspect = async value => ({ ...await inspect(value), alarms: [{ code: "JOB_NEVER_RUN", job: "OUTBOX_DELIVERY" }] }); expect((await executeJobCli(["inspect", '{"maxLagMs":1000}'], factory)).exitCode).toBe(2); });
});
