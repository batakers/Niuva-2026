import { apiError, apiSuccess } from "@/lib/http/response";
import { readJsonBody } from "@/lib/http/body";
import { authorizeCronRequest } from "@/lib/http/cron-auth";
import { getPrismaClient } from "@/lib/db/prisma";
import { appError } from "@/modules/shared/errors";
import { createOperationalJobRuntime } from "@/modules/jobs/runtime";
import { OperationalJobHttpEndpoint } from "@/modules/jobs/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(request: Request): Response | null {
  const result = authorizeCronRequest(request, process.env.CRON_SECRET);
  return result === "authorized" ? null : apiError(appError(result === "invalid" ? "UNAUTHORIZED" : "PROVIDER_UNAVAILABLE"), undefined, { boundary: "api:internal-job-auth" });
}
function endpoint() {
  return new OperationalJobHttpEndpoint(() => createOperationalJobRuntime({ prisma: getPrismaClient(), source: process.env }), "CUSTOMER_FILE_RETENTION");
}
export async function GET(request: Request): Promise<Response> {
  const denied = authorize(request);
  if (denied) return denied;
  try {
    const maxLagMs = Number(new URL(request.url).searchParams.get("maxLagMs"));
    return apiSuccess(await endpoint().status({ maxLagMs }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error, undefined, { boundary: "api:GET /api/internal/jobs/customer-file-retention" });
  }
}
export async function POST(request: Request): Promise<Response> {
  const denied = authorize(request);
  if (denied) return denied;
  try {
    return apiSuccess(await endpoint().run(await readJsonBody(request, { maxBytes: 4096 })), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error, undefined, { boundary: "api:POST /api/internal/jobs/customer-file-retention" });
  }
}
