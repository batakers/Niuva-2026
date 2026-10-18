import { apiError, apiSuccess } from "@/lib/http/response";
import { readJsonBody } from "@/lib/http/body";
import { authorizeCronRequest } from "@/lib/http/cron-auth";
import { getPrismaClient } from "@/lib/db/prisma";
import { appError } from "@/modules/shared/errors";
import { createOperationalJobRuntime } from "@/modules/jobs/runtime";
import { InventoryReservationJobRunner } from "@/modules/inventory/reservation-job";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(request: Request): Response | null {
  const result = authorizeCronRequest(request, process.env.CRON_SECRET);
  if (result === "authorized") return null;
  return apiError(appError(result === "invalid" ? "UNAUTHORIZED" : "PROVIDER_UNAVAILABLE"), undefined, { boundary: "api:internal-job-auth" });
}
function createRunner() {
  return new InventoryReservationJobRunner({ runtime: () => createOperationalJobRuntime({ prisma: getPrismaClient(), source: process.env }) });
}
export async function GET(request: Request): Promise<Response> {
  const denied = authorize(request);
  if (denied) return denied;
  try {
    const maxLagMs = Number(new URL(request.url).searchParams.get("maxLagMs"));
    return apiSuccess(await createRunner().status({ maxLagMs }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error, undefined, { boundary: "api:GET /api/internal/jobs/inventory-reservations" });
  }
}
export async function POST(request: Request): Promise<Response> {
  const denied = authorize(request);
  if (denied) return denied;
  try {
    return apiSuccess(await createRunner().run(await readJsonBody(request, { maxBytes: 4096 })), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error, undefined, { boundary: "api:POST /api/internal/jobs/inventory-reservations" });
  }
}
