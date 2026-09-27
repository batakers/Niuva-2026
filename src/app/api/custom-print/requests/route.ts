import { readJsonBody } from "@/lib/http/body";
import { requireCustomer } from "@/lib/auth/customer";
import { assertPublicMutationRequest } from "@/lib/http/public-mutation";
import {
  apiError,
  apiSuccess,
  createCorrelationId,
} from "@/lib/http/response";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import { CustomPrintService } from "@/modules/custom-print/service";
import { createCustomPrintAdminNotificationFromEnvironment } from "@/modules/notifications/resend";

export const runtime = "nodejs";

const CUSTOM_PRINT_REQUEST_MAX_BODY_BYTES = 32 * 1_024;
const customPrintRequestRateLimiter = createInMemoryRateLimiter({
  limit: 5,
  maxKeys: 256,
  windowMs: 60_000,
});

export async function POST(request: Request) {
  const correlationId = createCorrelationId();

  try {
    assertPublicMutationRequest(request, customPrintRequestRateLimiter);
    const customer = await requireCustomer();
    const payload = await readJsonBody(request, {
      maxBytes: CUSTOM_PRINT_REQUEST_MAX_BODY_BYTES,
    });
    const result = await new CustomPrintService({
      notificationFactory: createCustomPrintAdminNotificationFromEnvironment,
    }).submit(payload, customer);

    return apiSuccess(
      {
        requestId: result.request.id,
        referenceNumber: result.request.referenceNumber,
      },
      { correlationId, status: 201 },
    );
  } catch (error) {
    return apiError(error, correlationId);
  }
}
