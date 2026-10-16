import { z } from "zod";
import { hashOpaqueToken, safeCustomerReturnTo } from "../customer-auth/core";
import type { CustomerEmailRepository } from "../customer-auth/email-repository";
import type { CustomerPrivacyRepository, PrivacyActor } from "../customer-privacy/repository";
import type { PrivacyPurpose } from "../customer-privacy/core";
import { appError } from "../shared/errors";
import type { DurableOutboxService } from "./service";

const token = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const actorSchema = z.strictObject({ customerId: z.uuid(), sessionHash: z.string().regex(/^[A-Za-z0-9_-]{43}$/) });
const authInputSchema = z.strictObject({ to: z.email().max(254), token, purpose: z.enum(["verify", "reset"]), returnTo: z.string().max(2048), owner: z.union([z.strictObject({ pendingId: z.uuid() }), z.strictObject({ customerId: z.uuid() })]) })
  .refine(value => value.purpose === "verify" ? "pendingId" in value.owner : "customerId" in value.owner);
export type AuthProofInput = z.infer<typeof authInputSchema>;
export type ProofDeliveryState = "queued" | "accepted";
export type CustomerAuthProofDelivery = { issue(input: AuthProofInput): Promise<ProofDeliveryState> };
export type CustomerPrivacyProofDelivery = { issue(actor: PrivacyActor, purpose: PrivacyPurpose, token: string): Promise<ProofDeliveryState> };

export class CustomerOutboxProducer {
  constructor(private readonly options: { outbox: DurableOutboxService; authRepository: CustomerEmailRepository; privacyRepository: CustomerPrivacyRepository }) {}
  async auth(raw: AuthProofInput): Promise<"queued"> {
    const parsed = authInputSchema.safeParse(raw);
    if (!parsed.success) throw appError("VALIDATION_ERROR");
    const input = parsed.data;
    await this.options.outbox.withTransaction(async context => {
      const owner = "pendingId" in input.owner ? await context.tx.customerPendingRegistration.findUnique({ where: { id: input.owner.pendingId } }) : await context.tx.customer.findUnique({ where: { id: input.owner.customerId } });
      if (!owner || owner.email !== input.to) throw appError("VALIDATION_ERROR");
      const proof = await this.options.authRepository.issueTokenIn(context.tx, { tokenHash: hashOpaqueToken(input.token), purpose: input.purpose, ...input.owner, returnTo: safeCustomerReturnTo(input.returnTo), expiresAt: new Date(context.now.getTime() + (input.purpose === "verify" ? 86400000 : 1800000)) }, context.now);
      await context.enqueue({ kind: "AUTH", proofId: proof.id, token: input.token });
    });
    return "queued";
  }
  async privacy(rawActor: PrivacyActor, purpose: PrivacyPurpose, rawToken: string): Promise<"queued"> {
    const input = z.strictObject({ actor: actorSchema, purpose: z.enum(["EXPORT", "CLOSE"]), token }).safeParse({ actor: rawActor, purpose, token: rawToken });
    if (!input.success) throw appError("VALIDATION_ERROR");
    await this.options.outbox.withTransaction(async context => {
      const proof = await this.options.privacyRepository.issueIn(context.tx, input.data.actor, input.data.purpose, input.data.token, context.now);
      await context.enqueue({ kind: "PRIVACY", proofId: proof.id, token: input.data.token });
    });
    return "queued";
  }
}
