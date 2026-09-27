import { requireCustomer } from "@/lib/auth/customer";
import { readJsonBody } from "@/lib/http/body";
import { apiError, apiSuccess, createCorrelationId } from "@/lib/http/response";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { RoughCustomShippingService } from "@/modules/shipping/rough-custom";
import { appError } from "@/modules/shared/errors";

export const runtime = "nodejs";
const limiter = createInMemoryRateLimiter({ limit: 2, maxKeys: 256, windowMs: 10 * 60_000 });

export async function POST(request: Request, context: RouteContext<"/api/account/make/[id]/rough-shipping">) {
  const correlationId = createCorrelationId();
  try {
    assertSameOriginRequest(request);
    const customer = await requireCustomer();
    const { id } = await context.params;
    const rate = limiter.check(`${customer.id}:${id}`);
    if (!rate.allowed) throw appError("RATE_LIMITED", {
      details: { retryAfterSeconds: String(rate.retryAfterSeconds) },
    });
    const input = await readJsonBody(request, { maxBytes: 1_024 });
    const result = await new RoughCustomShippingService().checkRates(customer.id, id, input);
    const response = apiSuccess(result, { correlationId });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    const response = apiError(error, correlationId);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
