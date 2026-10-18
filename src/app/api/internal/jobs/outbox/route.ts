import { z } from "zod";
import { apiError, apiSuccess } from "@/lib/http/response";
import { readJsonBody } from "@/lib/http/body";
import { authorizeCronRequest } from "@/lib/http/cron-auth";
import { appError } from "@/modules/shared/errors";
import { createRuntimeBoundDatabase } from "@/modules/database-binding/runtime";
import { PrismaScheduledJobRepository } from "@/modules/scheduled-jobs/repository";
import { ScheduledJobService } from "@/modules/scheduled-jobs/service";
import { createRuntimeCustomerOutboxWorker } from "@/modules/outbox/runtime";
import { PrismaOutboxWorkerRepository } from "@/modules/outbox/worker-repository";
import { CustomerOutboxJobRunner, CUSTOMER_OUTBOX_JOB_REQUEST_LIMIT } from "@/modules/outbox/job-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const requestSchema = z.strictObject({
  mode: z.enum(["dry-run", "execute"]),
  limit: z.number().int().min(1).max(100),
}).refine(input => input.mode === "dry-run" || input.limit <= CUSTOMER_OUTBOX_JOB_REQUEST_LIMIT);

function authorize(request: Request): Response | null {
  const result = authorizeCronRequest(request, process.env.CRON_SECRET);
  if (result === "authorized") return null;
  return apiError(appError(result === "invalid" ? "UNAUTHORIZED" : "PROVIDER_UNAVAILABLE"), undefined, {
    boundary: "api:internal-job-auth",
  });
}

function createRunner() {
  const { env, bound } = createRuntimeBoundDatabase(process.env);
  const scheduledJobs = new ScheduledJobService({ bound, repository: new PrismaScheduledJobRepository() });
  const { policy, worker, repository } = createRuntimeCustomerOutboxWorker(env);
  return new CustomerOutboxJobRunner({ bound, scheduledJobs, worker, workerRepository: repository, policy });
}

export async function GET(request: Request): Promise<Response> {
  const denied = authorize(request);
  if (denied) return denied;
  try {
    const { bound } = createRuntimeBoundDatabase(process.env);
    const repository = new PrismaScheduledJobRepository();
    const scheduledJobs = new ScheduledJobService({ bound, repository });
    const workerRepository = new PrismaOutboxWorkerRepository();
    const [operational, lagMs] = await Promise.all([
      scheduledJobs.status("customer-outbox"),
      bound.run("job", async tx => {
        const now = await workerRepository.now(tx);
        const oldest = (await workerRepository.candidates(tx, now, 1, false))[0];
        return oldest ? Math.min(2_147_483_647, Math.max(0, now.getTime() - oldest.dueAt.getTime())) : 0;
      }),
    ]);
    return apiSuccess({ jobKey: "customer-outbox", ...operational, lagMs }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error, undefined, { boundary: "api:GET /api/internal/jobs/outbox" });
  }
}

export async function POST(request: Request): Promise<Response> {
  const denied = authorize(request);
  if (denied) return denied;
  try {
    const input = requestSchema.safeParse(await readJsonBody(request, { maxBytes: 1024 }));
    if (!input.success) throw appError("VALIDATION_ERROR");
    return apiSuccess(await createRunner().run(input.data), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error, undefined, { boundary: "api:POST /api/internal/jobs/outbox" });
  }
}
