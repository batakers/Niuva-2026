import { z } from "zod";
import { appError } from "../shared/errors";
import { parseWorkerPolicy } from "../outbox/worker-core";
import { parseJobPolicy, parseJobRequest, type JobName } from "./core";
import { parseJobInspectionRequest } from "./monitoring";
import type { OperationalJobRuntime } from "./runtime";

const inputSchema = z.strictObject({
  mode: z.enum(["dry-run", "execute"]),
  limit: z.number().int().min(1).max(100),
  jobPolicy: z.unknown(),
  workerPolicy: z.unknown().optional(),
});

/** HTTP and CLI share the same runner, role guard, lease, cooldown and monitoring. */
export class OperationalJobHttpEndpoint {
  constructor(private readonly runtime: OperationalJobRuntime | (() => OperationalJobRuntime), private readonly job: JobName) {}
  async run(raw: unknown) {
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) throw appError("VALIDATION_ERROR");
    const input = parsed.data;
    const needsWorker = this.job === "OUTBOX_DELIVERY";
    if (needsWorker !== (input.workerPolicy !== undefined)
      || (needsWorker || this.job === "CUSTOMER_FILE_RETENTION") && input.mode === "execute" && input.limit > 10) throw appError("VALIDATION_ERROR");
    const request = parseJobRequest({ job: this.job, mode: input.mode, limit: input.limit });
    const policy = parseJobPolicy(input.jobPolicy);
    const workerPolicy = needsWorker ? parseWorkerPolicy(input.workerPolicy) : undefined;
    return this.resolveRuntime().run(request, policy, workerPolicy);
  }
  async status(raw: unknown) {
    const request = parseJobInspectionRequest(raw);
    return this.resolveRuntime().inspect(request);
  }
  private resolveRuntime() {
    return typeof this.runtime === "function" ? this.runtime() : this.runtime;
  }
}
