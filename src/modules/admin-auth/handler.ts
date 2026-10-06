import { z } from "zod";
import type { createAdminAuthEngine } from "@/lib/auth/admin-engine";
import { PrismaAdminProfileRepository } from "@/modules/admin/repository";
import { isAdminSmtpConfigured } from "./mail";

type Engine = ReturnType<typeof createAdminAuthEngine>;
const password = z.string().min(12).max(128);
const schemas: Readonly<Record<string, z.ZodType>> = {
  "/sign-in/email": z.object({ email: z.email().max(254), password: z.string().min(1).max(128) }).strict(),
  "/sign-out": z.object({}).strict(),
  "/two-factor/enable": z.object({ password }).strict(),
  "/two-factor/verify-totp": z.object({ code: z.string().regex(/^\d{6}$/), trustDevice: z.literal(false).optional() }).strict(),
  "/two-factor/verify-backup-code": z.object({ code: z.string().min(1).max(64), trustDevice: z.literal(false).optional() }).strict(),
  "/two-factor/generate-backup-codes": z.object({ password }).strict(),
  "/change-password": z.object({ currentPassword: z.string().min(1).max(128), newPassword: password }).strict(),
  "/request-password-reset": z.object({ email: z.email().max(254) }).strict(),
  "/send-verification-email": z.object({ email: z.email().max(254) }).strict(),
  "/reset-password": z.object({ token: z.string().min(1).max(512), newPassword: password }).strict(),
};
const enrollmentPaths = new Set(["/two-factor/enable", "/two-factor/generate-backup-codes", "/change-password"]);
const MAX_AUTH_BODY_BYTES = 4096;
async function readBoundedBody(request: Request): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > MAX_AUTH_BODY_BYTES) { await reader.cancel(); return null; }
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(length);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder().decode(bytes);
  } finally { reader.releaseLock(); }
}
function error(status: number, code: string) {
  return Response.json({ error: { code, message: "Permintaan autentikasi Admin tidak dapat diproses." } }, { status, headers: { "Cache-Control": "no-store" } });
}

export async function handleAdminAuthRequest(request: Request, engine: Engine, dependencies: Readonly<{ profiles: Pick<PrismaAdminProfileRepository, "findByAuthUserId">; mailReady: () => boolean }> = { profiles: new PrismaAdminProfileRepository(), mailReady: isAdminSmtpConfigured }): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname.slice("/api/admin/auth".length);
  if (request.method === "GET") {
    if (path === "/status") {
      const session = await engine.api.getSession({ headers: request.headers });
      const profile = session ? await dependencies.profiles.findByAuthUserId(session.user.id) : null;
      const stage = !session ? "sign-in" : !profile?.isActive ? "forbidden" : !session.user.twoFactorEnabled ? "enroll" : session.session.mfaVerified ? "ready" : "sign-in";
      return Response.json({ stage }, { headers: { "Cache-Control": "no-store" } });
    }
    if (path !== "/verify-email" && !/^\/reset-password\/[^/]+$/.test(path)) return error(404, "NOT_FOUND");
    const callback = url.searchParams.get("callbackURL");
    const expectedCallback = `${url.origin}/admin/sign-in?${path === "/verify-email" ? "verified=1" : "flow=reset"}`;
    if (callback && callback !== expectedCallback) return error(400, "INVALID_INPUT");
    const response = await engine.handler(request);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
  if (request.method !== "POST" || !schemas[path]) return error(404, "NOT_FOUND");
  if (request.headers.get("origin") !== url.origin) return error(403, "FORBIDDEN");
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") return error(415, "INVALID_INPUT");
  if (Number(request.headers.get("content-length") ?? "0") > MAX_AUTH_BODY_BYTES) return error(413, "INVALID_INPUT");
  const raw = await readBoundedBody(request);
  if (raw === null) return error(413, "INVALID_INPUT");
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return error(400, "INVALID_INPUT"); }
  const parsed = schemas[path].safeParse(body);
  if (!parsed.success) return error(400, "INVALID_INPUT");
  const data = parsed.data as Record<string, unknown>;
  if (enrollmentPaths.has(path)) {
    const session = await engine.api.getSession({ headers: request.headers });
    const profile = session ? await dependencies.profiles.findByAuthUserId(session.user.id) : null;
    if (!session || !profile?.isActive) return error(403, "FORBIDDEN");
    if (path === "/two-factor/enable" && session.user.twoFactorEnabled) return error(403, "FORBIDDEN");
    if (path !== "/two-factor/enable" && (!session.session.mfaVerified || !session.user.twoFactorEnabled)) return error(401, "UNAUTHORIZED");
  }
  if ((path === "/request-password-reset" || path === "/send-verification-email") && !dependencies.mailReady()) return error(503, "AUTH_UNAVAILABLE");
  if (path === "/sign-in/email") { data.rememberMe = false; data.callbackURL = `${url.origin}/admin/sign-in?verified=1`; }
  if (path === "/request-password-reset") data.redirectTo = `${url.origin}/admin/sign-in?flow=reset`;
  if (path === "/send-verification-email") data.callbackURL = `${url.origin}/admin/sign-in?verified=1`;
  if (path === "/change-password") data.revokeOtherSessions = true;
  const response = await engine.handler(new Request(request.url, { method: "POST", headers: request.headers, body: JSON.stringify(data) }));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
