import { requireCustomer } from "@/lib/auth/customer";
import { readJsonBody } from "@/lib/http/body";
import { assertPublicMutationRequest } from "@/lib/http/public-mutation";
import { apiError, apiSuccess, createCorrelationId } from "@/lib/http/response";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import { CustomPrintAccessService } from "@/modules/custom-print/access-service";

export const runtime = "nodejs";
const limiter = createInMemoryRateLimiter({ limit: 5, maxKeys: 256, windowMs: 60_000 });

export async function POST(request: Request, context: RouteContext<"/api/account/make/[id]/model">) {
  const correlationId = createCorrelationId();
  try {
    assertPublicMutationRequest(request, limiter, {
      endpointId: "POST /api/account/make/[id]/model",
    });
    const customer = await requireCustomer();
    const { id } = await context.params;
    const body = await readJsonBody(request, { maxBytes: 4_096 });
    const data = typeof body === "object" && body !== null ? body : {};
    const result = await new CustomPrintAccessService().appendAccountModel({ ...data, requestId: id }, customer.id);
    const response = apiSuccess(result, { correlationId, status: 201 });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    const response = apiError(error, correlationId);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
