import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { isCustomerEmailTestRuntime } from "./email-test-runtime";
import { parseServerEnvironment } from "@/lib/env/server";
import { ResendEmailGateway } from "@/modules/notifications/resend";
import { assertNonProductionProvider } from "@/modules/providers/non-production";
export type CustomerAuthMailer = { send: (input: { to: string; token: string; purpose: "verify" | "reset"; returnTo: string; idempotencyKey: string }) => Promise<void> };
export function createCustomerAuthMailer(): CustomerAuthMailer | null {
  if (isCustomerEmailTestRuntime()) return { async send(input) {
    await mkdir(join(process.cwd(), "test-results"), { recursive: true });
    await appendFile(join(process.cwd(), "test-results", "customer-email-test-outbox.jsonl"), JSON.stringify({ ...input, fixture: true }) + "\n");
  } };
  const env = parseServerEnvironment();
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.APP_URL || env.NODE_ENV === "production") return null;
  const origin = new URL(env.APP_URL).origin;
  const gateway = new ResendEmailGateway({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM, fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(1000) }) });
  return { async send(input) {
    assertNonProductionProvider({ nodeEnv: env.NODE_ENV, provider: "Resend Customer auth" });
    const url = new URL(input.purpose === "verify" ? "/verify-email" : "/reset-password", origin);
    url.searchParams.set("token", input.token);
    await gateway.send({ to: input.to, idempotencyKey: input.idempotencyKey,
      subject: input.purpose === "verify" ? "Verifikasi email akun Niuva Anda" : "Atur ulang password Niuva Anda",
      text: `${input.purpose === "verify" ? "Verifikasi alamat email Anda untuk menyelesaikan pendaftaran akun Niuva. Tautan berlaku 24 jam." : "Gunakan tautan berikut untuk mengatur ulang password. Tautan berlaku 30 menit."}\n\n${url.href}\n\nJika Anda tidak meminta tindakan ini, abaikan email ini.` });
  } };
}
