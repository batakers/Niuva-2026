import { deriveActorKey } from "@/lib/security/actor-key";
import { assertSameOriginRequest } from "@/lib/security/origin";
import type { InMemoryRateLimiter } from "@/lib/security/rate-limit";
import { appError } from "@/modules/shared/errors";

export type PublicMutationOptions = Readonly<{
  /** Known only after authentication; routes guard before it, so usually omitted. */
  customerId?: string | null;
  /** Required: the limiter key is per actor and per endpoint. */
  endpointId: string;
}>;

export function assertPublicMutationRequest(
  request: Request,
  rateLimiter: InMemoryRateLimiter,
  options: PublicMutationOptions,
): void {
  assertSameOriginRequest(request);

  const { customerId, endpointId } = options;
  const key = deriveActorKey({
    customerId,
    endpointId,
    headers: request.headers,
  });
  const rateLimit = rateLimiter.check(key);

  if (!rateLimit.allowed) {
    throw appError("RATE_LIMITED", {
      details: { retryAfterSeconds: String(rateLimit.retryAfterSeconds) },
    });
  }
}
