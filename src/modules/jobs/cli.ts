import { z } from "zod";
import { appError, isAppError } from "../shared/errors";
import { parseWorkerPolicy } from "../outbox/worker-core";
import { parseJobPolicy, parseJobRequest, parseJobResult } from "./core";
import { parseJobInspectionRequest } from "./monitoring";
import type { OperationalJobRuntime } from "./runtime";

function json(value: string): unknown { try { return JSON.parse(value); } catch { throw appError("VALIDATION_ERROR"); } }
export async function executeJobCli(args: readonly string[], factory: () => OperationalJobRuntime): Promise<{ exitCode: number; output: unknown }> {
  try {
    if (args[0] === "inspect" && args.length === 2) {
      const request = parseJobInspectionRequest(json(args[1])), result = await factory().inspect(request);
      return { exitCode: result.alarms.length > 0 ? 2 : 0, output: result };
    }
    if (args[0] !== "run" || args.length < 3 || args.length > 4) throw appError("VALIDATION_ERROR");
    const request = parseJobRequest(json(args[1])), policy = parseJobPolicy(json(args[2]));
    const workerPolicy = args[3] === undefined ? undefined : parseWorkerPolicy(json(args[3]));
    if (request.job === "OUTBOX_DELIVERY" && !workerPolicy || request.job !== "OUTBOX_DELIVERY" && workerPolicy) throw appError("VALIDATION_ERROR");
    const result = await factory().run(request, policy, workerPolicy);
    const state = z.enum(["completed", "failed", "busy", "cooldown", "lost-lease"]).parse(result.state);
    const safe = parseJobResult({ counts: result.counts, ...(result.cooldownMs === undefined ? {} : { cooldownMs: result.cooldownMs }) });
    return { exitCode: state === "failed" || state === "lost-lease" ? 1 : 0, output: { job: request.job, mode: request.mode, state, ...safe } };
  } catch (error) {
    return { exitCode: 1, output: { status: "failed", category: isAppError(error) && error.code === "VALIDATION_ERROR" ? "INVALID_ARGUMENTS" : "JOB_UNAVAILABLE" } };
  }
}
