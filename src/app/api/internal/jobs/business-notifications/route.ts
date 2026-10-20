import { getPrismaClient } from "@/lib/db/prisma";
import { readJsonBody } from "@/lib/http/body";
import { apiError, apiSuccess } from "@/lib/http/response";
import { authorizeCronRequest } from "@/lib/http/cron-auth";
import { OperationalJobHttpEndpoint } from "@/modules/jobs/http";
import { createOperationalJobRuntime } from "@/modules/jobs/runtime";
import { appError } from "@/modules/shared/errors";

export const dynamic = "force-dynamic";
function endpoint() { return new OperationalJobHttpEndpoint(() => createOperationalJobRuntime({ prisma: getPrismaClient(), source: process.env }), "OUTBOX_BUSINESS"); }
function denied(request: Request) {
  const result = authorizeCronRequest(request, process.env.CRON_SECRET);
  return result === "authorized" ? null : apiError(appError(result === "invalid" ? "UNAUTHORIZED" : "PROVIDER_UNAVAILABLE"), undefined, { boundary: "api:business-notifications-auth" });
}
export async function GET(request: Request): Promise<Response> {
  const rejection = denied(request); if (rejection) return rejection;
  try { return apiSuccess(await endpoint().status({ maxLagMs: Number(new URL(request.url).searchParams.get("maxLagMs")) }), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return apiError(error, undefined, { boundary: "api:GET /api/internal/jobs/business-notifications" }); }
}
export async function POST(request: Request): Promise<Response> {
  const rejection = denied(request); if (rejection) return rejection;
  try {
    if (request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json") throw appError("VALIDATION_ERROR");
    return apiSuccess(await endpoint().run(await readJsonBody(request, { maxBytes: 4096 })), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error, undefined, { boundary: "api:POST /api/internal/jobs/business-notifications" }); }
}
