import { readJsonBody } from "@/lib/http/body";
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
    const payload = await readJsonBody(request, {
      maxBytes: CUSTOM_PRINT_REQUEST_MAX_BODY_BYTES,
    });
    const result = await new CustomPrintService({
      notification: createCustomPrintAdminNotificationFromEnvironment(),
    }).submit(payload);

    return apiSuccess(
      {
        accessToken: result.accessToken.token,
        referenceNumber: result.request.referenceNumber,
      },
      { correlationId, status: 201 },
    );
  } catch (error) {
    return apiError(error, correlationId);
  }
}
