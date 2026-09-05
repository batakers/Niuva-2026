import { readJsonBody } from "@/lib/http/body";
import { assertPublicMutationRequest } from "@/lib/http/public-mutation";
import {
  apiError,
  apiSuccess,
  createCorrelationId,
} from "@/lib/http/response";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import { InquiryService } from "@/modules/inquiry/service";
import { createInquiryAdminNotificationFromEnvironment } from "@/modules/notifications/resend";

export const runtime = "nodejs";

const PROJECT_BRIEF_MAX_BODY_BYTES = 32 * 1_024;
const projectBriefRateLimiter = createInMemoryRateLimiter({
  limit: 5,
  maxKeys: 256,
  windowMs: 60_000,
});

export async function POST(request: Request) {
  const correlationId = createCorrelationId();

  try {
    assertPublicMutationRequest(request, projectBriefRateLimiter);
    const payload = await readJsonBody(request, {
      maxBytes: PROJECT_BRIEF_MAX_BODY_BYTES,
    });
    const result = await new InquiryService({
      notification: createInquiryAdminNotificationFromEnvironment(),
    }).submit(payload);

    return apiSuccess(
      {
        accessToken: result.accessToken.token,
        referenceNumber: result.inquiry.referenceNumber,
      },
      { correlationId, status: 201 },
    );
  } catch (error) {
    return apiError(error, correlationId);
  }
}
