import { deriveActorKey } from "@/lib/security/actor-key";
import { assertSameOriginRequest } from "@/lib/security/origin";
import type { RateLimitResult } from "@/lib/security/rate-limit";
import { appError } from "@/modules/shared/errors";

export type PublicMutationOptions = Readonly<{
  /** Known only after authentication; routes guard before it, so usually omitted. */
  customerId?: string | null;
  /** Required: the limiter key is per actor and per endpoint. */
  endpointId: string;
}>;

export function assertPublicMutationRequest(
  request: Request,
  rateLimiter: Readonly<{ check: (key: string) => RateLimitResult | Promise<RateLimitResult> }>,
  options: PublicMutationOptions,
): void | Promise<void> {
  assertSameOriginRequest(request);

  const { customerId, endpointId } = options;
  const key = deriveActorKey({
    customerId,
    endpointId,
    headers: request.headers,
  });
  const rateLimit = rateLimiter.check(key);

  if (rateLimit instanceof Promise) return rateLimit.then(assertAllowed);
  assertAllowed(rateLimit);
}

function assertAllowed(rateLimit: RateLimitResult): void {
  if (!rateLimit.allowed) {
    throw appError("RATE_LIMITED", {
      details: { retryAfterSeconds: String(rateLimit.retryAfterSeconds) },
    });
  }
}
