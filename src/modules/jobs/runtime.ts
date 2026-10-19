import type { PrismaClient } from "../../generated/prisma/client";
import type { CapabilityContext } from "../capabilities/resolver";
import { createOutboxBinding } from "../outbox/runtime";
import { appError } from "../shared/errors";
import { parseJobRole, type JobPolicy, type JobRequest, type JobRunSummary } from "./core";
import type { WorkerPolicy } from "../outbox/worker-core";
import { parseBusinessPolicy, type BusinessPolicy } from "../outbox/business-core";
import { parseWorkerPolicy } from "../outbox/worker-core";
import { createJobHandlers } from "./handlers";
import { PrismaJobRepository } from "./repository";
import { JobRunner } from "./runner";
import { JobMonitoring, type JobInspection, type JobInspectionRequest } from "./monitoring";

export type JobExecutionPolicy = WorkerPolicy | BusinessPolicy;
export type OperationalJobRuntime = { run(request: JobRequest, policy: JobPolicy, executionPolicy?: JobExecutionPolicy): Promise<JobRunSummary>; inspect(request: JobInspectionRequest): Promise<JobInspection> };
export function createOperationalJobRuntime(options: { prisma: PrismaClient; source: Readonly<Record<string, string | undefined>>; context?: Omit<CapabilityContext, "env"> }): OperationalJobRuntime {
  const source = Object.freeze({ ...options.source }), expectedRole = parseJobRole(source.NIUVA_JOB_DATABASE_ROLE);
  const bound = createOutboxBinding(options.prisma, source, options.context), repository = new PrismaJobRepository();
  const monitor = new JobMonitoring(bound, repository, expectedRole);
  return Object.freeze({
    run: async (request: JobRequest, policy: JobPolicy, executionPolicy?: JobExecutionPolicy) => {
      const requiresPolicy = ["OUTBOX_DELIVERY", "OUTBOX_BUSINESS"].includes(request.job);
      if (requiresPolicy !== (executionPolicy !== undefined)) throw appError("VALIDATION_ERROR");
      const workerPolicy = request.job === "OUTBOX_DELIVERY" ? parseWorkerPolicy(executionPolicy) : undefined;
      const businessPolicy = request.job === "OUTBOX_BUSINESS" ? parseBusinessPolicy(executionPolicy) : undefined;
      return new JobRunner({ bound, repository, expectedRole, policy, handlers: createJobHandlers({ prisma: options.prisma, bound, source, workerPolicy, businessPolicy }) }).run(request);
    },
    inspect: (request: JobInspectionRequest) => monitor.inspect(request),
  });
}
