import type { AdminAccess } from "@/lib/auth/admin";
import { z } from "zod";
import { parseOwnerPrivacyListQuery } from "./validation";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { CustomerEmailRepository } from "@/modules/customer-auth/email-repository";
import { createOpaqueToken, hashOpaqueToken } from "@/modules/customer-auth/core";
import { appError } from "@/modules/shared/errors";
import { assertCustomerPrivacyAvailable, privacyPurposeSchema, privacyRequestSchema, privacyTokenSchema, privacyOwnerSchema } from "./core";
import { createPrivacyMailer, type PrivacyMailer } from "./mailer";
import { CustomerPrivacyRepository, type PrivacyActor } from "./repository";
import { createRuntimeCustomerOutbox } from "@/modules/outbox/runtime";
import type { DurableOutboxService } from "@/modules/outbox/service";

export class CustomerPrivacyService {
  constructor(readonly repository = new CustomerPrivacyRepository(), readonly mailer: PrivacyMailer | null = createPrivacyMailer(), readonly clock: () => Date = () => new Date(), readonly assertAvailable: () => void = assertCustomerPrivacyAvailable, readonly outbox: DurableOutboxService | null = createRuntimeCustomerOutbox()) {}
  async throttle(actor: PrivacyActor, action: string) {
    await new CustomerEmailRepository(this.repository.prisma).limit(`privacy:${action}:${hashOpaqueToken(actor.customerId)}`, action === "confirm" ? 10 : 3, 3600000, this.clock());
  }
  async sendConfirmation(actor: PrivacyActor, raw: unknown) {
    this.assertAvailable();
    const purpose = privacyPurposeSchema.parse(raw);
    const outbox = this.outbox;
    if (!this.mailer && !outbox) throw appError("PROVIDER_UNAVAILABLE", { message: "Email konfirmasi belum tersedia. Tidak ada izin tindakan yang diberikan." });
    await this.throttle(actor, "email");
    const token = createOpaqueToken();
    if (outbox) {
      await outbox.withTransaction(async ({ tx, now, enqueue }) => {
        const record = await this.repository.issueIn(tx, actor, purpose, token, now);
        const receipt = await enqueue({ kind: "PRIVACY", proofId: record.id, token });
        if (receipt.state !== "PENDING") throw appError("PROVIDER_UNAVAILABLE");
      });
      return { status: "queued" as const };
    }
    const mailer = this.mailer;
    if (!mailer) throw appError("PROVIDER_UNAVAILABLE", { message: "Email konfirmasi belum tersedia. Tidak ada izin tindakan yang diberikan." });
    const record = await this.repository.issue(actor, purpose, token, this.clock());
    try { await mailer.send({ to: record.to, token, purpose, idempotencyKey: `privacy:${record.id}` }); }
    catch { await this.repository.delivery(record.id, false, this.clock()); throw appError("PROVIDER_UNAVAILABLE", { message: "Email konfirmasi gagal dikirim. Tidak ada izin tindakan yang diberikan. Coba lagi nanti." }); }
    await this.repository.delivery(record.id, true, this.clock());
    return { status: "sent" };
  }
  async complete(actor: PrivacyActor, raw: { token?: unknown; purpose?: unknown; permanent?: unknown }) {
    this.assertAvailable();
    const token = privacyTokenSchema.parse(raw.token);
    const purpose = privacyPurposeSchema.parse(raw.purpose);
    if (purpose === "CLOSE" && raw.permanent !== "on") throw appError("VALIDATION_ERROR", { details: { permanent: "Konfirmasikan bahwa akun akan ditutup secara permanen." } });
    await this.throttle(actor, "confirm");
    return this.repository.complete(actor, token, purpose, this.clock());
  }
  async request(actor: PrivacyActor, raw: unknown) {
    this.assertAvailable();
    const input = privacyRequestSchema.parse(raw);
    await this.throttle(actor, "request");
    return this.repository.createRequest(actor, input, this.clock());
  }
  async handle(access: AdminAccess, raw: unknown) {
    this.assertAvailable();
    requireAdminPermission(access, "PRIVACY_REQUEST_MANAGE");
    return this.repository.handle(privacyOwnerSchema.parse(raw), access.profile.id, this.clock());
  }
  async getOwnerDetail(access: AdminAccess, id: string) {
    this.assertAvailable();
    requireAdminPermission(access, "PRIVACY_REQUEST_MANAGE");
    return this.repository.getOwnerDetail(z.uuid().parse(id));
  }
  async listOwner(access: AdminAccess, input: Readonly<Record<string, unknown>> = {}) {
    this.assertAvailable();
    requireAdminPermission(access, "PRIVACY_REQUEST_MANAGE");
    return this.repository.listOwnerFiltered(parseOwnerPrivacyListQuery(input));
  }
}
