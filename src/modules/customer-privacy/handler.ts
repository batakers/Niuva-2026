import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { requireCustomer } from "@/lib/auth/customer";
import { requireAdmin } from "@/lib/auth/admin";
import { readBoundedText } from "@/lib/http/body";
import { CUSTOMER_SESSION_COOKIE, hashOpaqueToken, customerSessionCookieOptions } from "@/modules/customer-auth/core";
import { customerAuthOrigin } from "@/modules/customer-auth/origin";
import { getInternalAuthConfig } from "@/modules/customer-auth/internal-testing";
import { isCustomerEmailTestRuntime } from "@/modules/customer-auth/email-test-runtime";
import { appError, isAppError } from "@/modules/shared/errors";
import { CustomerPrivacyService } from "./service";
import { serializePrivacyExport } from "./repository";

export function privacyRequestOrigin(request: Request): string {
  const internal = getInternalAuthConfig();
  if (internal) return internal.origin;
  const requestUrl = new URL(request.url);
  // Isolated E2E runs exercise both loopback names. This exception is never
  // enabled in Development/production, and cannot trust forwarded headers.
  if (isCustomerEmailTestRuntime()) {
    const origin = request.headers.get("origin");
    try { const input = new URL(origin ?? ""); if (["localhost", "127.0.0.1"].includes(input.hostname) && ["localhost", "127.0.0.1"].includes(requestUrl.hostname) && input.port === requestUrl.port && input.protocol === requestUrl.protocol) return input.origin; } catch { /* Fail closed below. */ }
  }
  return customerAuthOrigin(request);
}
export function assertPrivacyOrigin(request: Request) {
  const expected = privacyRequestOrigin(request);
  if (request.headers.get("origin") !== expected || request.headers.get("host") !== new URL(expected).host) throw appError("ORIGIN_NOT_ALLOWED");
}
export const PRIVACY_ERROR_MESSAGES: Readonly<Record<string, string>> = {
  PROVIDER_UNAVAILABLE: "Email konfirmasi gagal atau belum tersedia. Tidak ada izin tindakan yang diberikan.",
  VALIDATION_ERROR: "Periksa formulir. Tautan konfirmasi mungkin sudah digunakan atau kedaluwarsa; minta tautan baru.",
  RATE_LIMITED: "Terlalu banyak permintaan. Coba lagi dalam satu jam.",
  UNAUTHORIZED: "Sesi tidak berlaku. Masuk dan minta tautan baru dari browser yang sama.",
  ORIGIN_NOT_ALLOWED: "Permintaan berasal dari halaman yang tidak diizinkan.",
  LOCAL_SETUP_DISABLED: "Pusat privasi hanya tersedia pada Development lokal dan test yang diizinkan.",
  FORBIDDEN: "Hanya Owner yang dapat menangani permintaan privasi.",
  CONFLICT: "Permintaan yang sudah selesai tidak dapat dibuka ulang atau diubah hasilnya.",
  INTERNAL_ERROR: "Tindakan gagal diproses. Coba lagi; jangan menganggap tindakan telah selesai.",
};
export function privacyPostHandler(action: "email" | "export" | "close" | "request" | "owner", factory = () => new CustomerPrivacyService()) {
  return async (request: Request): Promise<Response> => {
    const json = request.headers.get("accept")?.includes("application/json") ?? false;
    let formId: string | undefined;
    try {
      assertPrivacyOrigin(request);
      if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) throw appError("VALIDATION_ERROR");
      const raw = Object.fromEntries(new URLSearchParams(await readBoundedText(request, 16384)));
      if (action === "owner" && /^[0-9a-f-]{36}$/i.test(raw.id ?? "")) formId = raw.id;
      const service = factory();
      let reference: string | undefined;
      if (action === "owner") {
        const result = await service.handle(await requireAdmin(), raw);
        reference = result.referenceNumber;
      } else {
        const customer = await requireCustomer();
        const token = (await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value;
        if (!token) throw appError("UNAUTHORIZED");
        const actor = { customerId: customer.id, sessionHash: hashOpaqueToken(token) };
        if (action === "email") await service.sendConfirmation(actor, raw.purpose);
        else if (action === "request") reference = (await service.request(actor, raw)).referenceNumber;
        else {
          const result = await service.complete(actor, { ...raw, purpose: action === "export" ? "EXPORT" : "CLOSE" });
          if (result.purpose === "EXPORT") return new Response(serializePrivacyExport(result.data), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="niuva-customer-data-v1.json"', "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
          const response = NextResponse.redirect(new URL("/account/privacy/closed", privacyRequestOrigin(request)), 303);
          response.cookies.set(CUSTOMER_SESSION_COOKIE, "", { ...customerSessionCookieOptions(false), maxAge: 0 });
          response.headers.set("Cache-Control", "no-store");
          return response;
        }
      }
      const status = action === "email" ? "sent" : action === "owner" ? "updated" : "received";
      const path = action === "owner" ? "/admin/privacy" : "/account/privacy";
      const url = `${path}?status=${status}${reference ? `&reference=${encodeURIComponent(reference)}` : ""}`;
      if (json) return Response.json({ ok: true, status, url }, { headers: { "Cache-Control": "no-store" } });
      return NextResponse.redirect(new URL(url, privacyRequestOrigin(request)), 303);
    } catch (error) {
      const fields: Record<string, string> = {};
      if (error instanceof ZodError) for (const issue of error.issues) fields[String(issue.path[0])] ??= issue.message;
      if (isAppError(error) && error.details) Object.assign(fields, error.details);
      const code = error instanceof ZodError ? "VALIDATION_ERROR" : isAppError(error) ? error.code : "INTERNAL_ERROR";
      const message = PRIVACY_ERROR_MESSAGES[code] ?? "Permintaan tidak dapat diproses.";
      const status = error instanceof ZodError ? 422 : isAppError(error) ? error.status : 500;
      // Reject invalid-origin requests directly, without constructing redirects
      // from attacker-controlled host/origin headers.
      if (json || code === "ORIGIN_NOT_ALLOWED") return Response.json({ ok: false, code, message, fields }, { status, headers: { "Cache-Control": "no-store" } });
      const url = new URL(action === "owner" ? "/admin/privacy" : "/account/privacy", customerAuthOrigin(request));
      url.searchParams.set("error", code);
      if (Object.keys(fields).length) url.searchParams.set("fields", JSON.stringify(fields));
      if (formId) url.searchParams.set("form", formId);
      return NextResponse.redirect(url, 303);
    }
  };
}
