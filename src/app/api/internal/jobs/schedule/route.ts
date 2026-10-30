import { z } from "zod";
import { getPrismaClient } from "@/lib/db/prisma";
import { readJsonBody } from "@/lib/http/body";
import { apiError, apiSuccess } from "@/lib/http/response";
import { authorizeCronRequest } from "@/lib/http/cron-auth";
import { readExplicitDeploymentTier } from "@/lib/env/deployment";
import { createOperationalJobRuntime } from "@/modules/jobs/runtime";
import { JOB_SCHEDULES, runJobScheduleTick } from "@/modules/jobs/schedule";
import { appError } from "@/modules/shared/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// One tick of the reviewed schedule for this tier. The caller sends `{}` and
// cannot supply jobs, limits or policies; a tier without a schedule is refused
// before a runtime is created.
export async function POST(request: Request): Promise<Response> {
  const result = authorizeCronRequest(request, process.env.CRON_SECRET);
  if (result !== "authorized") return apiError(appError(result === "invalid" ? "UNAUTHORIZED" : "PROVIDER_UNAVAILABLE"), undefined, { boundary: "api:job-schedule-auth" });
  try {
    if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") throw appError("VALIDATION_ERROR");
    if (!z.strictObject({}).safeParse(await readJsonBody(request, { maxBytes: 64 })).success) throw appError("VALIDATION_ERROR");
    const tier = readExplicitDeploymentTier(process.env), schedule = tier === undefined ? null : JOB_SCHEDULES[tier];
    if (!schedule) throw appError("PROVIDER_UNAVAILABLE");
    return apiSuccess(await runJobScheduleTick(createOperationalJobRuntime({ prisma: getPrismaClient(), source: process.env }), schedule), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error, undefined, { boundary: "api:POST /api/internal/jobs/schedule" });
  }
}
