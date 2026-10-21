import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { readJsonBody } from "@/lib/http/body";
import { apiError, apiSuccess } from "@/lib/http/response";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { createRuntimeRateLimiter } from "@/lib/security/shared-rate-limit";
import { RefundExecutionService } from "@/modules/refund/execution-service";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";
export const runtime = "nodejs";
const limiter = createRuntimeRateLimiter({ namespace: "admin-refund-execution", limit: 10, maxKeys: 256, windowMs: 10 * 60_000 });
const envelope = z.strictObject({ operation: z.enum(["submit", "reconcile", "authorize-manual", "confirm-manual", "revoke-manual"]), input: z.record(z.string(), z.unknown()).refine(value => !Object.hasOwn(value, "orderId")) });
export async function POST(request: Request, context: RouteContext<"/api/admin/orders/[id]/refund/execution">) {
  try {
    assertSameOriginRequest(request);
    if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") throw appError("VALIDATION_ERROR");
    const access = await requireAdmin(), { id } = await context.params;
    if (!(await limiter.check(access.profile.id)).allowed) throw appError("RATE_LIMITED");
    const body = parseWithValidation(envelope, await readJsonBody(request, { maxBytes: 4096 }));
    const service = new RefundExecutionService({ authorizeAdmin: async () => access }), input = { ...body.input, orderId: id };
    if (body.operation === "submit") await service.submit(input);
    else if (body.operation === "authorize-manual") await service.authorizeManual(input);
    else if (body.operation === "confirm-manual") await service.confirmManual(input);
    else if (body.operation === "revoke-manual") await service.revokeManual(input);
    else { parseWithValidation(z.strictObject({}), body.input); await service.reconcile(id); }
    return apiSuccess({ recorded: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { const response = apiError(error, undefined, { boundary: "api:refund-execution" }); response.headers.set("Cache-Control", "private, no-store"); return response; }
}
