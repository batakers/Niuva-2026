import { z } from "zod";
import { appError } from "../shared/errors";
import { parseWorkerPolicy } from "../outbox/worker-core";
import { parseBusinessPolicy } from "../outbox/business-core";
import { parseJobPolicy, parseJobRequest, type JobName } from "./core";
import { parseJobInspectionRequest } from "./monitoring";
import type { OperationalJobRuntime } from "./runtime";

const inputSchema = z.strictObject({
  mode: z.enum(["dry-run", "execute"]),
  limit: z.number().int().min(1).max(100),
  jobPolicy: z.unknown(),
  workerPolicy: z.unknown().optional(),
  businessPolicy: z.unknown().optional(),
});

/** HTTP and CLI share the same runner, role guard, lease, cooldown and monitoring. */
export class OperationalJobHttpEndpoint {
  constructor(private readonly runtime: OperationalJobRuntime | (() => OperationalJobRuntime), private readonly job: JobName) {}
  async run(raw: unknown) {
    const parsed = inputSchema.safeParse(raw);
    if (!parsed.success) throw appError("VALIDATION_ERROR");
    const input = parsed.data;
    const needsWorker = this.job === "OUTBOX_DELIVERY";
    const needsBusiness = this.job === "OUTBOX_BUSINESS";
    if (needsWorker !== (input.workerPolicy !== undefined)
      || needsBusiness !== (input.businessPolicy !== undefined)
      || (needsWorker || needsBusiness || this.job === "CUSTOMER_FILE_RETENTION" || this.job === "PAYMENT_RECONCILIATION") && input.mode === "execute" && input.limit > 10) throw appError("VALIDATION_ERROR");
    const request = parseJobRequest({ job: this.job, mode: input.mode, limit: input.limit });
    const policy = parseJobPolicy(input.jobPolicy);
    const executionPolicy = needsWorker ? parseWorkerPolicy(input.workerPolicy) : needsBusiness ? parseBusinessPolicy(input.businessPolicy) : undefined;
    return this.resolveRuntime().run(request, policy, executionPolicy);
  }
  async status(raw: unknown) {
    const request = parseJobInspectionRequest(raw);
    return this.resolveRuntime().inspect(request);
  }
  private resolveRuntime() {
    return typeof this.runtime === "function" ? this.runtime() : this.runtime;
  }
}
