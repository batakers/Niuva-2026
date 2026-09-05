import {
  parseBrandRuntimeInput,
  writeBrandRuntime,
} from "@/lib/auis/brand-runtime";
import { readJsonBody } from "@/lib/http/body";
import {
  apiError,
  apiSuccess,
  createCorrelationId,
} from "@/lib/http/response";
import { assertLocalSameOriginRequest } from "@/lib/security/origin";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import { appError } from "@/modules/shared/errors";

export const runtime = "nodejs";

const BRAND_MUTATION_MAX_BODY_BYTES = 16 * 1_024;
const brandMutationRateLimiter = createInMemoryRateLimiter({
  limit: 10,
  maxKeys: 64,
  windowMs: 60_000,
});

export async function POST(request: Request) {
  const correlationId = createCorrelationId();

  try {
    if (process.env.NODE_ENV === "production") {
      throw appError("LOCAL_SETUP_DISABLED");
    }

    assertLocalSameOriginRequest(request);

    const rateLimit = brandMutationRateLimiter.check(new URL(request.url).origin);

    if (!rateLimit.allowed) {
      throw appError("RATE_LIMITED", {
        details: {
          retryAfterSeconds: String(rateLimit.retryAfterSeconds),
        },
      });
    }

    const payload = await readJsonBody(request, {
      maxBytes: BRAND_MUTATION_MAX_BODY_BYTES,
    });
    const input = parseBrandRuntimeInput(payload);

    await writeBrandRuntime(input);

    return apiSuccess(
      { configured: input.configured, ok: true },
      { correlationId },
    );
  } catch (error) {
    return apiError(error, correlationId);
  }
}
