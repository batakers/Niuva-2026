import { readBoundedText } from "@/lib/http/body";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ZodError } from "zod";
import { CustomerEmailService } from "./email-service";
import { CUSTOMER_SESSION_COOKIE, customerSessionCookieOptions, safeCustomerReturnTo } from "./core";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { appError, toAppError } from "@/modules/shared/errors";
export const PENDING_REGISTRATION_COOKIE = "niuva_customer_pending";
export type EmailAction = "register" | "login" | "verify" | "resend" | "forgot-password" | "reset-password";
const pages: Record<EmailAction, string> = { register: "/register", login: "/login", verify: "/verify-email", resend: "/verify-email", "forgot-password": "/forgot-password", "reset-password": "/reset-password" };
export function emailPostHandler(action: EmailAction, factory: () => CustomerEmailService = () => new CustomerEmailService()) {
  return async (request: Request): Promise<Response> => {
    const json = request.headers.get("accept")?.includes("application/json") ?? false;
    let returnTo = "/account";
    let token: string | undefined;
    try {
      assertSameOriginRequest(request);
      if (!request.headers.get("content-type")?.startsWith("application/x-www-form-urlencoded")) throw appError("VALIDATION_ERROR");
      const body = await readBoundedText(request, 8192);
      const form = new URLSearchParams(body);
      const input = Object.fromEntries(form);
      returnTo = safeCustomerReturnTo(input.returnTo);
      token = input.token;
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "loopback";
      const service = factory();
      let destination = pages[action];
      const cookieStore = await cookies();
      let session: Awaited<ReturnType<CustomerEmailService["login"]>> | undefined;
      let handle: string | null | undefined;
      let status: string | undefined;
      if (action === "register") {
        const result = await service.register(input, ip);
        handle = result.handle;
        destination = "/verify-email";
        status = result.sent ? "sent" : result.handle ? "delivery_failed" : "registration_received";
      } else if (action === "login") {
        session = await service.login(input, ip);
        destination = session.returnTo;
      } else if (action === "verify") {
        returnTo = await service.verify(token ?? "", ip);
        destination = "/login"; status = "verified";
      } else if (action === "resend") {
        handle = cookieStore.get(PENDING_REGISTRATION_COOKIE)?.value;
        await service.resend(handle ?? "", returnTo, ip); status = "sent";
      } else if (action === "forgot-password") {
        await service.forgot(input.email, returnTo, ip); status = "reset_requested";
      } else {
        returnTo = await service.reset(token ?? "", input.password, input.confirmPassword, ip);
        destination = "/login"; status = "password_reset";
      }
      const url = new URL(destination, request.url);
      if (!session) { url.searchParams.set("returnTo", returnTo); if (status) url.searchParams.set("status", status); }
      const response = json ? NextResponse.json({ destination: url.pathname + url.search + url.hash }) : NextResponse.redirect(url, 303);
      response.headers.set("Cache-Control", "no-store");
      if (session) {
        const options = customerSessionCookieOptions(process.env.NODE_ENV === "production");
        if (session.remember) options.maxAge = session.maxAge;
        else Reflect.deleteProperty(options, "maxAge");
        response.cookies.set(CUSTOMER_SESSION_COOKIE, session.token, options);
      }
      if (handle) response.cookies.set(PENDING_REGISTRATION_COOKIE, handle, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 86400 });
      if (action === "verify" || action === "register" && handle === null) response.cookies.delete(PENDING_REGISTRATION_COOKIE);
      if (action === "reset-password") response.cookies.delete(CUSTOMER_SESSION_COOKIE);
      return response;
    } catch (error) {
      const app = toAppError(error);
      const fields: Record<string, string> = {};
      if (error instanceof ZodError) for (const issue of error.issues) fields[String(issue.path[0] ?? "form")] ??= issue.message;
      else if (app.details) Object.assign(fields, app.details);
      const message = error instanceof ZodError ? "Periksa kembali data yang Anda masukkan." : app.message;
      if (json) return NextResponse.json({ message, fields }, { status: error instanceof ZodError ? 422 : app.status, headers: { "Cache-Control": "no-store" } });
      const url = new URL(pages[action], request.url);
      url.searchParams.set("returnTo", returnTo);
      url.searchParams.set("error", error instanceof ZodError ? "validation" : app.code.toLowerCase());
      if (token && /^[A-Za-z0-9_-]{43}$/.test(token)) url.searchParams.set("token", token);
      return NextResponse.redirect(url, 303);
    }
  };
}
