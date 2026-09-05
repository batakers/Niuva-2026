import { assertSameOriginRequest } from "@/lib/security/origin";
import type { InMemoryRateLimiter } from "@/lib/security/rate-limit";
import { appError } from "@/modules/shared/errors";

export function assertPublicMutationRequest(
  request: Request,
  rateLimiter: InMemoryRateLimiter,
): void {
  assertSameOriginRequest(request);

  const rateLimit = rateLimiter.check(new URL(request.url).origin);

  if (!rateLimit.allowed) {
    throw appError("RATE_LIMITED", {
      details: { retryAfterSeconds: String(rateLimit.retryAfterSeconds) },
    });
  }
}
