import { createHash, randomBytes } from "node:crypto";
import { hashPassword } from "better-auth/crypto";
import { z } from "zod";
import type { AdminAccess } from "@/lib/auth/admin";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { appError } from "@/modules/shared/errors";
import type { AdminAuthMail } from "./mail";
import type { AdminInvitationRepository } from "./invitation-repository";
import { adminNewPasswordSchema } from "./password-policy";

export const adminInvitationInput = z.object({
  displayName: z.string().trim().min(1).max(100),
  email: z.email().max(254).transform(value => value.trim().toLowerCase()),
}).strict();
export const acceptAdminInvitationInput = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  password: adminNewPasswordSchema,
}).strict();
export const invitationTokenHash = (token: string): string => createHash("sha256").update(token).digest("hex");
const INVALID_INVITATION = "Undangan tidak berlaku atau sudah digunakan. Minta Owner mengirim undangan baru.";

export class AdminInvitationService {
  constructor(private readonly repository: AdminInvitationRepository, private readonly mail: Readonly<{
    ready: () => boolean;
    send: (mail: AdminAuthMail) => Promise<void>;
    baseUrl: string;
  }>, private readonly now: () => Date = () => new Date()) {}

  async invite(access: AdminAccess, raw: unknown): Promise<void> {
    requireAdminPermission(access, "ADMIN_PROFILE_MANAGE");
    const parsed = adminInvitationInput.safeParse(raw);
    if (!parsed.success) throw appError("VALIDATION_ERROR", { message: "Isi nama dan alamat email Admin yang valid." });
    if (!this.mail.ready()) throw appError("AUTH_UNAVAILABLE", { message: "Email undangan belum tersedia. Minta pengelola mengonfigurasi SMTP Admin." });
    const input = parsed.data;
    const token = randomBytes(32).toString("base64url");
    const tokenHash = invitationTokenHash(token);
    const now = this.now();
    await this.repository.withEmailLock(input.email, async store => {
      const owner = await store.findOwner(access.profile.id);
      if (!owner?.isActive || owner.role !== "OWNER") throw appError("FORBIDDEN");
      if (await store.hasAccount(input.email)) throw appError("CONFLICT", { message: "Email ini sudah memiliki akun Admin. Gunakan alamat email lain." });
      const previous = await store.findByEmail(input.email);
      if (previous?.status === "ACCEPTED" || (previous && previous.status !== "FAILED" && previous.expiresAt > now)) {
        throw appError("CONFLICT", { message: "Undangan untuk email ini masih berlaku. Periksa inbox dan spam, atau kirim kembali setelah 30 menit." });
      }
      await store.saveInvitation({ ...input, tokenHash, invitedByAdminId: access.profile.id, expiresAt: new Date(now.getTime() + 30 * 60_000) });
    });
    const url = new URL("/admin/sign-in", this.mail.baseUrl);
    url.searchParams.set("flow", "invite");
    // The fragment never enters HTTP request URLs or server access logs.
    url.hash = new URLSearchParams({ token }).toString();
    try {
      await this.mail.send({ to: input.email, url: url.toString(), kind: "invite" });
    } catch {
      await this.repository.markDelivery(tokenHash, "FAILED");
      throw appError("AUTH_UNAVAILABLE", { message: "Undangan gagal dikirim. Periksa layanan email, lalu kirim kembali dengan data yang sama." });
    }
    await this.repository.markDelivery(tokenHash, "SENT");
  }

  async accept(raw: unknown): Promise<void> {
    const parsed = acceptAdminInvitationInput.safeParse(raw);
    if (!parsed.success) throw appError("VALIDATION_ERROR", { message: "Gunakan tautan undangan yang valid dan password sepanjang 8–15 karakter." });
    const tokenHash = invitationTokenHash(parsed.data.token);
    const invitation = await this.repository.findByToken(tokenHash);
    if (!invitation || invitation.status !== "SENT" || invitation.expiresAt <= this.now()) throw appError("CONFLICT", { message: INVALID_INVITATION });
    // Hash before opening a transaction; an invitation never creates a login session.
    const passwordHash = await hashPassword(parsed.data.password);
    await this.repository.withEmailLock(invitation.email, async store => {
      const current = await store.findByToken(tokenHash);
      const now = this.now();
      if (!current || current.status !== "SENT" || current.expiresAt <= now || await store.hasAccount(current.email)) {
        throw appError("CONFLICT", { message: INVALID_INVITATION });
      }
      const owner = await store.findOwner(current.invitedByAdminId);
      if (!owner?.isActive || owner.role !== "OWNER") throw appError("CONFLICT", { message: INVALID_INVITATION });
      await store.activateAdmin(current, passwordHash, now);
    });
  }
}
