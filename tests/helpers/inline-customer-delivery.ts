import type { CustomerEmailRepository } from "@/modules/customer-auth/email-repository";
import type { CustomerAuthMailer } from "@/modules/customer-auth/email-mailer";
import { hashOpaqueToken } from "@/modules/customer-auth/core";
import { capInternalExpiry } from "@/modules/customer-auth/internal-testing";
import type { CustomerPrivacyRepository } from "@/modules/customer-privacy/repository";
import type { PrivacyMailer } from "@/modules/customer-privacy/mailer";
import { appError } from "@/modules/shared/errors";
import type { CustomerAuthProofDelivery, CustomerPrivacyProofDelivery } from "@/modules/outbox/producer";

// Domain fixtures control time/transport; real queue-to-worker coverage lives in customer-outbox-flow.
export function inlineAuthProofDelivery(repository: CustomerEmailRepository, mailer: CustomerAuthMailer, clock: () => Date = () => new Date()): CustomerAuthProofDelivery {
  return { async issue(input) {
    const now = clock(), pendingId = "pendingId" in input.owner ? input.owner.pendingId : undefined;
    const deadline = await repository.deliveryDeadline(input.owner, now);
    const proof = await repository.issueToken({ tokenHash: hashOpaqueToken(input.token), purpose: input.purpose, ...input.owner, returnTo: input.returnTo, expiresAt: capInternalExpiry(new Date(now.getTime() + (input.purpose === "verify" ? 86400000 : 1800000)), deadline) }, now);
    try { await mailer.send({ to: input.to, token: input.token, purpose: input.purpose, returnTo: input.returnTo, idempotencyKey: `customer-${input.purpose}:${proof.id}` }); }
    catch { await repository.markDeliveryFailed(proof.id, pendingId); throw appError("PROVIDER_UNAVAILABLE"); }
    if (pendingId) await repository.confirmDelivery(pendingId);
    return "accepted";
  } };
}
export function inlinePrivacyProofDelivery(repository: CustomerPrivacyRepository, mailer: PrivacyMailer, clock: () => Date): CustomerPrivacyProofDelivery {
  return { async issue(actor, purpose, token) {
    const proof = await repository.issue(actor, purpose, token, clock());
    try { await mailer.send({ to: proof.to, token, purpose, idempotencyKey: `privacy:${proof.id}` }); }
    catch { await repository.delivery(proof.id, false, clock()); throw appError("PROVIDER_UNAVAILABLE"); }
    await repository.delivery(proof.id, true, clock());
    return "accepted";
  } };
}
