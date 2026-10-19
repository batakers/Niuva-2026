import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { readJsonBody } from "@/lib/http/body";
import { apiError, apiSuccess, createCorrelationId } from "@/lib/http/response";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { createRuntimeRateLimiter } from "@/lib/security/shared-rate-limit";
import { RefundService } from "@/modules/refund/service";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";

export const runtime = "nodejs";
const limiter = createRuntimeRateLimiter({ namespace: "admin-refund-review", limit: 20, maxKeys: 256, windowMs: 10 * 60_000 });
const envelope = z.strictObject({ operation: z.enum(["intake", "approve", "refresh", "receive-return"]), input: z.record(z.string(), z.unknown()).refine(value => !Object.hasOwn(value, "orderId")) });
function privateResponse(response: Response): Response { response.headers.set("Cache-Control", "private, no-store"); return response; }
export async function GET(_request: Request, context: RouteContext<"/api/admin/orders/[id]/refund">) {
  const correlationId = createCorrelationId();
  try {
    const access = await requireAdmin(), { id } = await context.params;
    const service = new RefundService({ authorizeAdmin: async () => access });
    return privateResponse(apiSuccess(await service.adminOrder(id), { correlationId }));
  } catch (error) { return privateResponse(apiError(error, correlationId)); }
}
export async function POST(request: Request, context: RouteContext<"/api/admin/orders/[id]/refund">) {
  const correlationId = createCorrelationId();
  try {
    assertSameOriginRequest(request);
    if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") throw appError("VALIDATION_ERROR");
    const access = await requireAdmin(), { id } = await context.params;
    const rate = await limiter.check(access.profile.id);
    if (!rate.allowed) throw appError("RATE_LIMITED", { details: { retryAfterSeconds: String(rate.retryAfterSeconds) } });
    const body = parseWithValidation(envelope, await readJsonBody(request, { maxBytes: 4096 }));
    const service = new RefundService({ authorizeAdmin: async () => access }), input = { ...body.input, orderId: id };
    const result = body.operation === "intake" ? await service.intake(input)
      : body.operation === "approve" ? await service.approve(input)
        : body.operation === "refresh" ? await service.refresh(input) : await service.receiveReturn(input);
    return privateResponse(apiSuccess(result, { correlationId }));
  } catch (error) { return privateResponse(apiError(error, correlationId)); }
}
