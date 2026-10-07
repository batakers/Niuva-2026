import nodemailer from "nodemailer";
import { parseServerEnvironment } from "@/lib/env/server";
import { appError } from "@/modules/shared/errors";

export type AdminAuthMail = Readonly<{ to: string; url: string; kind: "reset" | "verify" | "invite" }>;

export function isAdminSmtpConfigured(): boolean {
  const env = parseServerEnvironment();
  return Boolean(env.ADMIN_SMTP_HOST && [465, 587].includes(env.ADMIN_SMTP_PORT ?? 0) && env.ADMIN_SMTP_USER && env.ADMIN_SMTP_PASSWORD && env.ADMIN_EMAIL_FROM);
}

export async function sendAdminAuthMail(mail: AdminAuthMail): Promise<void> {
  const env = parseServerEnvironment();
  if (!isAdminSmtpConfigured()) throw appError("AUTH_UNAVAILABLE");
  const transport = nodemailer.createTransport({
    host: env.ADMIN_SMTP_HOST,
    port: env.ADMIN_SMTP_PORT,
    secure: env.ADMIN_SMTP_PORT === 465,
    requireTLS: true,
    auth: { user: env.ADMIN_SMTP_USER, pass: env.ADMIN_SMTP_PASSWORD },
    connectionTimeout: 10_000,
    socketTimeout: 20_000,
    logger: false,
    debug: false,
  });
  const subject = mail.kind === "invite" ? "Undangan menjadi Admin NIUVA" : mail.kind === "reset" ? "Atur ulang password Admin NIUVA" : "Verifikasi email Admin NIUVA";
  const instructions = mail.kind === "invite" ? "Owner NIUVA mengundang Anda sebagai Admin. Buat password Anda sendiri melalui tautan berikut, lalu masuk dan aktifkan authenticator sebelum mengakses Dashboard." : `${mail.kind === "reset" ? "Atur ulang password" : "Verifikasi alamat email"} akun Admin NIUVA melalui tautan berikut.`;
  try {
    await transport.sendMail({ from: env.ADMIN_EMAIL_FROM, to: mail.to, subject, text: `${instructions} Tautan berlaku selama 30 menit dan hanya dapat digunakan sekali.\n\n${mail.url}\n\nJika Anda tidak meminta ini, abaikan email ini.` });
  } catch {
    throw appError("AUTH_UNAVAILABLE");
  } finally {
    transport.close();
  }
}
