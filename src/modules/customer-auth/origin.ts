import { assertSameOriginRequest } from "@/lib/security/origin";
import { appError } from "@/modules/shared/errors";
import { getInternalAuthConfig } from "./internal-testing";
import { isCustomerPublicAuthTestRuntime } from "./email-test-runtime";

function configuredAuthOrigin(): string | undefined {
  return getInternalAuthConfig()?.origin ?? (isCustomerPublicAuthTestRuntime() ? new URL(process.env.APP_URL!).origin : undefined);
}

export function customerAuthOrigin(request: Request): string {
  return configuredAuthOrigin() ?? new URL(request.url).origin;
}
export function assertCustomerAuthOrigin(request: Request): void {
  const origin = configuredAuthOrigin();
  if (!origin) { assertSameOriginRequest(request); return; }
  // Next dev may normalize request.url to localhost. Only the configured public
  // origin and exact Host are accepted; forwarded headers never select an origin.
  if (request.headers.get("origin") !== origin || request.headers.get("host") !== new URL(origin).host) {
    throw appError("ORIGIN_NOT_ALLOWED");
  }
}
