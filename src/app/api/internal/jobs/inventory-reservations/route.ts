import { apiError, apiSuccess } from "@/lib/http/response";
import { readJsonBody } from "@/lib/http/body";
import { authorizeCronRequest } from "@/lib/http/cron-auth";
import { appError } from "@/modules/shared/errors";
import { createPrismaAuditRecorder } from "@/modules/shared/audit";
import { createRuntimeBoundDatabase } from "@/modules/database-binding/runtime";
import { InventoryRepository } from "@/modules/inventory/repository";
import {
  InventoryReservationJobRunner,
  inventoryReservationJobRequestSchema,
} from "@/modules/inventory/reservation-job";
import { InventoryService } from "@/modules/inventory/service";
import { PrismaScheduledJobRepository } from "@/modules/scheduled-jobs/repository";
import { ScheduledJobService } from "@/modules/scheduled-jobs/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(request: Request): Response | null {
  const result = authorizeCronRequest(request, process.env.CRON_SECRET);
  if (result === "authorized") return null;
  return apiError(appError(result === "invalid" ? "UNAUTHORIZED" : "PROVIDER_UNAVAILABLE"), undefined, {
    boundary: "api:internal-job-auth",
  });
}

function createRunner() {
  const { bound, prisma } = createRuntimeBoundDatabase(process.env);
  const scheduledJobRepository = new PrismaScheduledJobRepository();
  const scheduledJobs = new ScheduledJobService({ bound, repository: scheduledJobRepository });
  const inventory = new InventoryService({
    audit: createPrismaAuditRecorder(prisma),
    repository: new InventoryRepository(prisma),
  });
  return new InventoryReservationJobRunner({ bound, inventory, scheduledJobRepository, scheduledJobs });
}

export async function GET(request: Request): Promise<Response> {
  const denied = authorize(request);
  if (denied) return denied;
  try {
    return apiSuccess(await createRunner().status(), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error, undefined, { boundary: "api:GET /api/internal/jobs/inventory-reservations" });
  }
}

export async function POST(request: Request): Promise<Response> {
  const denied = authorize(request);
  if (denied) return denied;
  try {
    const parsed = inventoryReservationJobRequestSchema.safeParse(
      await readJsonBody(request, { maxBytes: 1024 }),
    );
    if (!parsed.success) throw appError("VALIDATION_ERROR");
    return apiSuccess(await createRunner().run(parsed.data), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error, undefined, { boundary: "api:POST /api/internal/jobs/inventory-reservations" });
  }
}
