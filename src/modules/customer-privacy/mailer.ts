import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseServerEnvironment } from "@/lib/env/server";
import { isCustomerEmailTestRuntime } from "@/modules/customer-auth/email-test-runtime";
import { getInternalAuthConfig } from "@/modules/customer-auth/internal-testing";
import { ResendEmailGateway } from "@/modules/notifications/resend";
import { appError } from "@/modules/shared/errors";
import type { PrivacyPurpose } from "./core";

export type PrivacyMail = { to: string; token: string; purpose: PrivacyPurpose; idempotencyKey: string };
export type PrivacyMailer = { send(input: PrivacyMail): Promise<void> };
export function createPrivacyMailer(): PrivacyMailer | null {
  if (isCustomerEmailTestRuntime()) return { async send(input) {
    const directory = join(process.cwd(), "test-results");
    await mkdir(directory, { recursive: true });
    await appendFile(join(directory, "customer-privacy-test-outbox.jsonl"), JSON.stringify({ ...input, fixture: true }) + "\n");
  } };
  const internal = getInternalAuthConfig();
  const env = parseServerEnvironment();
  if (!internal || !env.RESEND_API_KEY || !env.EMAIL_FROM) return null;
  const gateway = new ResendEmailGateway({ apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM, fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10000) }) });
  return { async send(input) {
    const config = getInternalAuthConfig();
    if (!config || ![config.googleEmail, config.passwordEmail].includes(input.to.toLowerCase())) throw appError("LOCAL_SETUP_DISABLED");
    const url = new URL("/account/privacy/confirm", config.origin);
    url.searchParams.set("token", input.token);
    url.searchParams.set("action", input.purpose);
    await gateway.send({ to: input.to, idempotencyKey: input.idempotencyKey,
      subject: input.purpose === "EXPORT" ? "Konfirmasi unduhan data Niuva" : "Konfirmasi penutupan permanen akun Niuva",
      text: `Anda meminta ${input.purpose === "EXPORT" ? "salinan data" : "penutupan permanen akun"} Niuva. Buka tautan ini pada browser dan sesi yang sama dengan permintaan Anda, lalu konfirmasikan tindakan. Tautan sekali pakai berlaku 15 menit. Membuka tautan saja tidak menjalankan tindakan.\n\n${url.href}\n\nJika Anda tidak meminta tindakan ini, abaikan email ini.` });
  } };
}
