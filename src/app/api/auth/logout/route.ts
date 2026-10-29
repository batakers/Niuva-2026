import { NextResponse } from "next/server";

import {
  isCustomerSessionStoreAvailable,
  revokeCurrentCustomerSession,
} from "@/lib/auth/customer";
import { apiError, createCorrelationId } from "@/lib/http/response";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { CUSTOMER_SESSION_COOKIE } from "@/modules/customer-auth/core";
import { clientIpCandidate } from "@/lib/security/client-ip";
import { createRuntimeRateLimiter } from "@/lib/security/shared-rate-limit";
import { appError } from "@/modules/shared/errors";

export const runtime = "nodejs";

const logoutRateLimiter = createRuntimeRateLimiter({ namespace: "src/app/api/auth/logout/route.ts",
  limit: 20,
  maxKeys: 512,
  windowMs: 15 * 60 * 1_000,
});

export async function POST(request: Request): Promise<Response> {
  const correlationId = createCorrelationId();

  try {
    assertSameOriginRequest(request);
  } catch (error) {
    return apiError(error, correlationId);
  }

  try {
    const key = clientIpCandidate(request.headers) || new URL(request.url).origin;
    if (!(await logoutRateLimiter.check(key)).allowed) {
      return apiError(appError("RATE_LIMITED"), correlationId);
    }

    if (isCustomerSessionStoreAvailable()) {
      await revokeCurrentCustomerSession();
    }

    const response = new NextResponse(null, { status: 204 });
    response.cookies.delete(CUSTOMER_SESSION_COOKIE);
    return response;
  } catch (error) {
    return apiError(error, correlationId);
  }
}
