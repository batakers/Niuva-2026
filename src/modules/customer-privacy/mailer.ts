import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { parseServerEnvironment } from "@/lib/env/server";
import { isCustomerEmailTestRuntime } from "@/modules/customer-auth/email-test-runtime";
import { getInternalAuthConfig } from "@/modules/customer-auth/internal-testing";
import { ResendEmailGateway, type ResendEmailResult } from "@/modules/notifications/resend";
import { appError } from "@/modules/shared/errors";
import type { PrivacyPurpose } from "./core";
import { emailEnvelopeSchema, type PreparedCustomerEmail } from "../notifications/email-delivery";

export type PrivacyMail = { to: string; token: string; purpose: PrivacyPurpose; idempotencyKey: string; signal?: AbortSignal };
export type PrivacyMailer = { prepare?(input: PrivacyMail): PreparedCustomerEmail; send(input: PrivacyMail): Promise<ResendEmailResult | void> };
export function createPrivacyMailer(source: Readonly<Record<string, string | undefined>> = process.env): PrivacyMailer | null {
  source = Object.freeze({ ...source });
  if (isCustomerEmailTestRuntime(source)) {
    const prepare = (input: PrivacyMail): PreparedCustomerEmail => ({
      envelope: Object.freeze({ from: "fixture@example.test", to: input.to, subject: input.purpose, text: input.token }),
      async send(_envelope, idempotencyKey) {
        const directory = join(process.cwd(), "test-results");
        await mkdir(directory, { recursive: true });
        await appendFile(join(directory, "customer-privacy-test-outbox.jsonl"), JSON.stringify({ ...input, idempotencyKey, signal: undefined, fixture: true }) + "\n");
      },
    });
    return { prepare, async send(input) { const ready = prepare(input); return ready.send(ready.envelope, input.idempotencyKey, input.signal); } };
  }
  const internal = getInternalAuthConfig(source);
  const env = parseServerEnvironment(source);
  if (!internal || !env.RESEND_API_KEY || !env.EMAIL_FROM) return null;
  const apiKey = env.RESEND_API_KEY, from = env.EMAIL_FROM;
  const prepare = (input: PrivacyMail): PreparedCustomerEmail => {
    const check = () => {
      const config = getInternalAuthConfig(source);
      if (!config || ![config.googleEmail, config.passwordEmail].includes(input.to.toLowerCase())) throw appError("LOCAL_SETUP_DISABLED");
      return config;
    };
    const config = check();
    const url = new URL("/account/privacy/confirm", config.origin);
    url.searchParams.set("token", input.token);
    url.searchParams.set("action", input.purpose);
    const envelope = Object.freeze(emailEnvelopeSchema.parse({ from, to: input.to,
      subject: input.purpose === "EXPORT" ? "Konfirmasi unduhan data Niuva" : "Konfirmasi penutupan permanen akun Niuva",
      text: `Anda meminta ${input.purpose === "EXPORT" ? "salinan data" : "penutupan permanen akun"} Niuva. Buka tautan ini pada browser dan sesi yang sama dengan permintaan Anda, lalu konfirmasikan tindakan. Tautan sekali pakai berlaku 15 menit. Membuka tautan saja tidak menjalankan tindakan.\n\n${url.href}\n\nJika Anda tidak meminta tindakan ini, abaikan email ini.` }));
    return { envelope, async send(saved, idempotencyKey, signal) {
      check(); const value = emailEnvelopeSchema.parse(saved);
      if (value.to !== input.to) throw appError("LOCAL_SETUP_DISABLED");
      const gateway = new ResendEmailGateway({ apiKey, from: value.from, fetch: (url, options) => fetch(url, { ...options, signal: options?.signal ? AbortSignal.any([options.signal, AbortSignal.timeout(10000)]) : AbortSignal.timeout(10000) }) });
      return gateway.send({ to: value.to, subject: value.subject, text: value.text, idempotencyKey, signal });
    } };
  };
  return { prepare, async send(input) { const ready = prepare(input); return ready.send(ready.envelope, input.idempotencyKey, input.signal); } };
}
