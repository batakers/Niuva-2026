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

const UPLOAD_CONFIRM_MAX_BODY_BYTES = 4 * 1_024;
const uploadConfirmRateLimiter = createInMemoryRateLimiter({
  limit: 20,
  maxKeys: 256,
  windowMs: 60_000,
});

export async function POST(request: Request) {
  const correlationId = createCorrelationId();

  try {
    assertPublicMutationRequest(request, uploadConfirmRateLimiter);
    const payload = await readJsonBody(request, {
      maxBytes: UPLOAD_CONFIRM_MAX_BODY_BYTES,
    });
    const result = await new UploadService().confirmUpload(payload);

    return apiSuccess(result, { correlationId });
  } catch (error) {
    return apiError(error, correlationId);
  }
}
