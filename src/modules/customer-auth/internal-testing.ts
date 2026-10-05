import { z } from "zod";
import { parseInternalAuthEnvironment } from "../../lib/env/internal-auth";
import { appError } from "../shared/errors";
import { normalizeCustomerEmail } from "./core";

export const INTERNAL_AUTH_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const INTERNAL_GOOGLE_CONSENT_COOKIE = "niuva_internal_google_consent";
export const INTERNAL_TERMS_VERSION = "INTERNAL-TERMS-2026-10-02-v1";
export const INTERNAL_PRIVACY_VERSION = "INTERNAL-PRIVACY-2026-10-02-v1";
export type InternalAuthConfig = Readonly<{ origin: string; googleEmail: string; passwordEmail: string }>;
// APP_URL keeps its original lenient parse; the loopback/origin rules follow below.
const appUrlSchema = z.string().url();

// Cleanup deliberately does not depend on the signup flag or provider readiness.
export function isInternalAuthDatabase(source: Readonly<Record<string, string | undefined>> = process.env): boolean {
  if (source.NODE_ENV !== "development" || source.NIUVA_RUNTIME_MODE && source.NIUVA_RUNTIME_MODE !== "live") return false;
  try {
    const db = new URL(source.DATABASE_URL ?? "");
    // pg connection-string query options can override the URL host/database.
    // Only Prisma's public schema marker is allowed on this destructive path.
    const safeQuery = [...db.searchParams].every(([key, value]) => key === "schema" && value === "public");
    return ["postgres:", "postgresql:"].includes(db.protocol) && db.hostname === "127.0.0.1" && decodeURIComponent(db.pathname) === "/niuva_dev" && safeQuery && !db.hash;
  } catch { return false; }
}

export function getInternalAuthConfig(source: Readonly<Record<string, string | undefined>> = process.env): InternalAuthConfig | null {
  if (!isInternalAuthDatabase(source) || source.NIUVA_CUSTOMER_AUTH_MOCK && source.NIUVA_CUSTOMER_AUTH_MOCK !== "false") return null;
  // Field shapes come from the single env schema source (src/lib/env/internal-auth.ts).
  const internal = parseInternalAuthEnvironment(source);
  const appUrl = appUrlSchema.safeParse(source.APP_URL);
  if (!internal || internal.NIUVA_INTERNAL_AUTH_ENABLED !== true || !appUrl.success) return null;
  const { NIUVA_INTERNAL_GOOGLE_EMAIL: rawGoogleEmail, NIUVA_INTERNAL_PASSWORD_EMAIL: rawPasswordEmail } = internal;
  if (rawGoogleEmail === undefined || rawPasswordEmail === undefined) return null;
  const app = new URL(appUrl.data);
  if (!["127.0.0.1", "localhost", "[::1]"].includes(app.hostname) || !["http:", "https:"].includes(app.protocol) || app.username || app.password || app.pathname !== "/" || app.search || app.hash) return null;
  const googleEmail = normalizeCustomerEmail(rawGoogleEmail);
  const passwordEmail = normalizeCustomerEmail(rawPasswordEmail);
  if (googleEmail === passwordEmail) return null;
  return { origin: app.origin, googleEmail, passwordEmail };
}

export function internalExpiry(now: Date): Date { return new Date(now.getTime() + INTERNAL_AUTH_RETENTION_MS); }
export function capInternalExpiry(expiresAt: Date, deadline?: Date | null): Date {
  return deadline && deadline < expiresAt ? deadline : expiresAt;
}
export function assertInternalAccountActive(deadline: Date | null | undefined, now: Date): void {
  if (deadline && deadline <= now) throw appError("UNAUTHORIZED", { message: "Masa pengujian akun sudah berakhir." });
}
export function assertInternalEmail(email: string, method: "google" | "password", config = getInternalAuthConfig()): void {
  if (!config || normalizeCustomerEmail(email) !== (method === "google" ? config.googleEmail : config.passwordEmail)) {
    throw appError("CUSTOMER_AUTH_UNAVAILABLE", { message: "Pendaftaran ini hanya tersedia untuk alamat email peserta pengujian internal." });
  }
}
