import { NextResponse } from "next/server";

import {
  isCustomerSessionStoreAvailable,
  revokeCurrentCustomerSession,
} from "@/lib/auth/customer";
import { apiError, createCorrelationId } from "@/lib/http/response";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { CUSTOMER_SESSION_COOKIE } from "@/modules/customer-auth/core";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import { appError } from "@/modules/shared/errors";

export const runtime = "nodejs";

const logoutRateLimiter = createInMemoryRateLimiter({
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
    const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
    const key = forwarded || new URL(request.url).origin;
    if (!logoutRateLimiter.check(key).allowed) {
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
