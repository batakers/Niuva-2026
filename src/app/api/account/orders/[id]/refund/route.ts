import { requireCustomer } from "@/lib/auth/customer";
import { readJsonBody } from "@/lib/http/body";
import { apiError, apiSuccess, createCorrelationId } from "@/lib/http/response";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { createRuntimeRateLimiter } from "@/lib/security/shared-rate-limit";
import { refundRequestSchema } from "@/modules/refund/schema";
import { RefundService } from "@/modules/refund/service";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";

export const runtime = "nodejs";
const limiter = createRuntimeRateLimiter({ namespace: "customer-refund-request", limit: 10, maxKeys: 256, windowMs: 10 * 60_000 });
const bodySchema = refundRequestSchema.omit({ orderId: true });
function privateResponse(response: Response): Response { response.headers.set("Cache-Control", "private, no-store"); return response; }

export async function GET(_request: Request, context: RouteContext<"/api/account/orders/[id]/refund">) {
  const correlationId = createCorrelationId();
  try {
    const customer = await requireCustomer(), { id } = await context.params;
    return privateResponse(apiSuccess(await new RefundService().customerOrder(customer.id, id), { correlationId }));
  } catch (error) { return privateResponse(apiError(error, correlationId)); }
}
export async function POST(request: Request, context: RouteContext<"/api/account/orders/[id]/refund">) {
  const correlationId = createCorrelationId();
  try {
    assertSameOriginRequest(request);
    if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") throw appError("VALIDATION_ERROR");
    const customer = await requireCustomer(), { id } = await context.params;
    const rate = await limiter.check(customer.id);
    if (!rate.allowed) throw appError("RATE_LIMITED", { details: { retryAfterSeconds: String(rate.retryAfterSeconds) } });
    const body = parseWithValidation(bodySchema, await readJsonBody(request, { maxBytes: 4096 }));
    return privateResponse(apiSuccess(await new RefundService().request(customer.id, { ...body, orderId: id }), { correlationId }));
  } catch (error) { return privateResponse(apiError(error, correlationId)); }
}
