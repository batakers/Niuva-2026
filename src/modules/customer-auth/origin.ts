import { assertSameOriginRequest } from "@/lib/security/origin";
import { appError } from "@/modules/shared/errors";
import { getInternalAuthConfig } from "./internal-testing";

export function customerAuthOrigin(request: Request): string {
  return getInternalAuthConfig()?.origin ?? new URL(request.url).origin;
}
export function assertCustomerAuthOrigin(request: Request): void {
  const internal = getInternalAuthConfig();
  if (!internal) { assertSameOriginRequest(request); return; }
  // Next dev may normalize request.url to localhost. Only the configured public
  // origin and exact Host are accepted; forwarded headers never select an origin.
  if (request.headers.get("origin") !== internal.origin || request.headers.get("host") !== new URL(internal.origin).host) {
    throw appError("ORIGIN_NOT_ALLOWED");
  }
}
