import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { readBoundedText } from "@/lib/http/body";
import { createRuntimeRateLimiter } from "@/lib/security/shared-rate-limit";
import { assertCustomerAuthOrigin, customerAuthOrigin } from "@/modules/customer-auth/origin";
import { customerCookieSecure } from "@/modules/customer-auth/app-origin";
import { GOOGLE_CONSENT_COOKIE, GOOGLE_CONSENT_MAX_AGE_SECONDS, GoogleConsentService } from "@/modules/customer-auth/google-consent";
import { safeCustomerReturnTo } from "@/modules/customer-auth/core";
import { appError, toAppError } from "@/modules/shared/errors";

export const runtime = "nodejs";
const limiter = createRuntimeRateLimiter({ namespace: "customer-public-google-consent", limit: 10, maxKeys: 512, windowMs: 900000 });

export async function POST(request: Request): Promise<Response> {
  const json = request.headers.get("accept")?.includes("application/json") ?? false;
  let returnTo = "/account";
  try {
    assertCustomerAuthOrigin(request);
    if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) throw appError("VALIDATION_ERROR");
    const raw = Object.fromEntries(new URLSearchParams(await readBoundedText(request, 8192)));
    returnTo = safeCustomerReturnTo(raw.returnTo);
    const key = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim() || new URL(request.url).origin;
    if (!(await limiter.check(key)).allowed) throw appError("RATE_LIMITED");
    const token = await new GoogleConsentService().accept(raw);
    const destination = `/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`;
    // A native POST stays on our origin; its following link starts OAuth under form-action CSP.
    const response = json ? NextResponse.json({ destination }) : NextResponse.redirect(new URL(`/register/google?continue=1&returnTo=${encodeURIComponent(returnTo)}`, customerAuthOrigin(request)), 303);
    response.cookies.set(GOOGLE_CONSENT_COOKIE, token, { httpOnly: true, secure: customerCookieSecure(process.env), sameSite: "lax", path: "/api/auth/google", maxAge: GOOGLE_CONSENT_MAX_AGE_SECONDS });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const app = toAppError(error);
    const response = json
      ? NextResponse.json({ message: app.code === "RATE_LIMITED" ? "Terlalu banyak percobaan. Tunggu beberapa saat." : "Periksa persetujuan Anda. Jika policy berubah, muat ulang halaman sebelum melanjutkan." }, { status: error instanceof ZodError ? 422 : app.status })
      : NextResponse.redirect(new URL(`/register/google?returnTo=${encodeURIComponent(returnTo)}&error=${app.code === "RATE_LIMITED" ? "rate_limited" : "validation"}`, customerAuthOrigin(request)), 303);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
