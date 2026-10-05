import { requireCustomer } from "@/lib/auth/customer";
import { readJsonBody } from "@/lib/http/body";
import { assertPublicMutationRequest } from "@/lib/http/public-mutation";
import { apiError, apiSuccess, createCorrelationId } from "@/lib/http/response";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import { CustomerPreviewService } from "@/modules/custom-print/customer-preview-service";

export const runtime = "nodejs";

const previewRateLimiter = createInMemoryRateLimiter({ limit: 15, maxKeys: 256, windowMs: 60_000 });

export async function POST(request: Request) {
  const correlationId = createCorrelationId();
  try {
    assertPublicMutationRequest(request, previewRateLimiter, {
      endpointId: "POST /api/custom-print/preview-estimate",
    });
    const customer = await requireCustomer();
    const payload = await readJsonBody(request, { maxBytes: 8 * 1_024 });
    const result = await new CustomerPreviewService().preview(payload, customer.id);
    const response = apiSuccess(result, { correlationId });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    const response = apiError(error, correlationId);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
