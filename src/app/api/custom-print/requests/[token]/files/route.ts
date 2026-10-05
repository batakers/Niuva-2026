import { readJsonBody } from "@/lib/http/body";
import { assertPublicMutationRequest } from "@/lib/http/public-mutation";
import { apiError, apiSuccess, createCorrelationId } from "@/lib/http/response";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import { CustomPrintAccessService } from "@/modules/custom-print/access-service";
import { getCurrentCustomer } from "@/lib/auth/customer";

export const runtime = "nodejs";

const limiter = createInMemoryRateLimiter({ limit: 5, maxKeys: 256, windowMs: 60_000 });

export async function POST(request: Request, context: RouteContext<"/api/custom-print/requests/[token]/files">) {
  const correlationId = createCorrelationId();
  try {
    assertPublicMutationRequest(request, limiter, {
      endpointId: "POST /api/custom-print/requests/[token]/files",
    });
    const { token } = await context.params;
    const payload = await readJsonBody(request, { maxBytes: 4 * 1_024 });
    const data = typeof payload === "object" && payload !== null ? payload : {};
    const customer = await getCurrentCustomer();
    const result = await new CustomPrintAccessService().appendModel({ ...data, token }, customer?.id);
    const response = apiSuccess(result, { correlationId, status: 201 });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    const response = apiError(error, correlationId);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
