import { readJsonBody } from "@/lib/http/body";
import { assertPublicMutationRequest } from "@/lib/http/public-mutation";
import {
  apiError,
  apiSuccess,
  createCorrelationId,
} from "@/lib/http/response";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import { UploadService } from "@/modules/files/upload-service";

export const runtime = "nodejs";

const UPLOAD_INTENT_MAX_BODY_BYTES = 4 * 1_024;
const uploadIntentRateLimiter = createInMemoryRateLimiter({
  limit: 10,
  maxKeys: 256,
  windowMs: 60_000,
});

export async function POST(request: Request) {
  const correlationId = createCorrelationId();

  try {
    assertPublicMutationRequest(request, uploadIntentRateLimiter);
    const payload = await readJsonBody(request, {
      maxBytes: UPLOAD_INTENT_MAX_BODY_BYTES,
    });
    const result = await new UploadService().createIntent(payload);

    return apiSuccess(
      {
        expiresAt: result.expiresAt.toISOString(),
        fileId: result.fileId,
        requiredHeaders: result.requiredHeaders,
        uploadToken: result.uploadToken,
        uploadUrl: result.uploadUrl,
      },
      { correlationId, status: 201 },
    );
  } catch (error) {
    return apiError(error, correlationId);
  }
}
