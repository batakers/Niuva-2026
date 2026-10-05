import { NextResponse } from "next/server";
import { z } from "zod";
import { readBoundedText } from "@/lib/http/body";
import { assertCustomerAuthOrigin, customerAuthOrigin } from "@/modules/customer-auth/origin";
import { InternalGoogleConsentService } from "@/modules/customer-auth/internal-consent";
import { INTERNAL_GOOGLE_CONSENT_COOKIE } from "@/modules/customer-auth/internal-testing";
import { customerCookieSecure } from "@/modules/customer-auth/app-origin";
import { safeCustomerReturnTo } from "@/modules/customer-auth/core";
import { appError, toAppError } from "@/modules/shared/errors";
import { ageDeclarationSchema } from "@/modules/customer-auth/age-declaration";
export const runtime = "nodejs";
const schema = z.object({ consent: z.literal("on"), ageDeclaration: ageDeclarationSchema, returnTo: z.string().max(2048).optional() });
export async function POST(request: Request): Promise<Response> {
  let returnTo = "/account";
  const json = request.headers.get("accept")?.includes("application/json") ?? false;
  try {
    assertCustomerAuthOrigin(request);
    if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) throw appError("VALIDATION_ERROR");
    const raw = Object.fromEntries(new URLSearchParams(await readBoundedText(request, 2048)));
    returnTo = safeCustomerReturnTo(typeof raw.returnTo === "string" ? raw.returnTo : undefined);
    schema.parse(raw);
    const token = await new InternalGoogleConsentService().accept(raw);
    const destination = `/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`;
    // Native form redirects stay on our origin: Chromium applies form-action
    // CSP to the redirect chain. A subsequent plain link starts OAuth safely.
    const response = json ? NextResponse.json({ destination }) : NextResponse.redirect(new URL(`/internal-testing/google-consent?continue=1&returnTo=${encodeURIComponent(returnTo)}`, customerAuthOrigin(request)), 303);
    response.cookies.set(INTERNAL_GOOGLE_CONSENT_COOKIE, token, { httpOnly: true, secure: customerCookieSecure(process.env), sameSite: "lax", path: "/api/auth/google", maxAge: 600 });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    const status = toAppError(error).code === "RATE_LIMITED" ? "rate_limited" : "validation";
    if (json) return NextResponse.json({ message: status === "rate_limited" ? "Terlalu banyak percobaan. Tunggu beberapa saat." : "Persetujuan belum dapat disimpan. Periksa pilihan Anda dan coba lagi." }, { status: error instanceof z.ZodError ? 422 : toAppError(error).status, headers: { "Cache-Control": "no-store" } });
    const response = NextResponse.redirect(new URL(`/internal-testing/google-consent?returnTo=${encodeURIComponent(returnTo)}&error=${status}`, customerAuthOrigin(request)), 303);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
