import { randomUUID } from "node:crypto";
import type { PrismaClient, Prisma } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { appError } from "@/modules/shared/errors";
import { assertInternalAccountActive, capInternalExpiry } from "@/modules/customer-auth/internal-testing";
import { hashOpaqueToken } from "@/modules/customer-auth/core";
import { DAY_MS, PRIVACY_CONFIRMATION_MS, privacyDeadline, type PrivacyPurpose, privacyRequestSchema, privacyOwnerSchema } from "./core";
import { lockCustomerLifecycle, eraseCustomerAccount } from "./lifecycle";
import type { z } from "zod";
import type { OwnerPrivacyListQuery } from "./validation";

export type PrivacyActor = { customerId: string; sessionHash: string };
export class CustomerPrivacyRepository {
  constructor(readonly prisma: PrismaClient = getPrismaClient()) {}
  async active(tx: Prisma.TransactionClient, actor: PrivacyActor, now: Date) {
    const session = await tx.customerSession.findFirst({ where: { customerId: actor.customerId, tokenHash: actor.sessionHash, revokedAt: null, expiresAt: { gt: now } }, include: { customer: true } });
    if (!session) throw appError("UNAUTHORIZED");
    assertInternalAccountActive(session.customer.internalTestExpiresAt, now);
    return session;
  }
  async issue(actor: PrivacyActor, purpose: PrivacyPurpose, token: string, now: Date) {
    return this.prisma.$transaction(async tx => {
      await lockCustomerLifecycle(tx);
      const session = await this.active(tx, actor, now);
      await tx.customerPrivacyConfirmation.updateMany({ where: { customerId: actor.customerId, sessionHash: actor.sessionHash, purpose, consumedAt: null }, data: { consumedAt: now } });
      const expiresAt = capInternalExpiry(new Date(Math.min(now.getTime() + PRIVACY_CONFIRMATION_MS, session.expiresAt.getTime())), session.customer.internalTestExpiresAt);
      const proof = await tx.customerPrivacyConfirmation.create({ data: { customerId: actor.customerId, sessionHash: actor.sessionHash, tokenHash: hashOpaqueToken(token), purpose, expiresAt, createdAt: now } });
      return { id: proof.id, to: session.customer.email };
    });
  }
  async delivery(id: string, delivered: boolean, now: Date) {
    await this.prisma.customerPrivacyConfirmation.updateMany({ where: { id, consumedAt: null, customerId: { not: null } }, data: delivered ? { delivered: true } : { consumedAt: now } });
  }
  async preview(actor: PrivacyActor, token: string, purpose: PrivacyPurpose, now: Date) {
    const proof = await this.prisma.customerPrivacyConfirmation.findFirst({ where: { customerId: actor.customerId, sessionHash: actor.sessionHash, tokenHash: hashOpaqueToken(token), purpose, delivered: true, consumedAt: null, expiresAt: { gt: now } }, select: { expiresAt: true } });
    return proof;
  }
  async complete(actor: PrivacyActor, token: string, purpose: PrivacyPurpose, now: Date) {
    return this.prisma.$transaction(async tx => {
      await lockCustomerLifecycle(tx);
      await this.active(tx, actor, now);
      const claimed = await tx.customerPrivacyConfirmation.updateMany({ where: { customerId: actor.customerId, sessionHash: actor.sessionHash, tokenHash: hashOpaqueToken(token), purpose, delivered: true, consumedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } });
      if (claimed.count !== 1) throw appError("VALIDATION_ERROR", { message: "Tautan tidak valid, sudah digunakan, atau kedaluwarsa. Minta tautan baru dari Pusat privasi." });
      if (purpose === "EXPORT") return { purpose, data: await exportCustomerData(tx, actor.customerId, now) };
      await eraseCustomerAccount(tx, actor.customerId, now);
      return { purpose, data: null };
    }, { timeout: 20000 });
  }
  async createRequest(actor: PrivacyActor, input: z.infer<typeof privacyRequestSchema>, now: Date) {
    return this.prisma.$transaction(async tx => {
      await lockCustomerLifecycle(tx);
      const session = await this.active(tx, actor, now);
      const submissionKey = hashOpaqueToken(`${actor.customerId}:${input.submissionKey}`);
      const existing = await tx.customerPrivacyRequest.findUnique({ where: { submissionKey } });
      if (existing) return existing;
      return tx.customerPrivacyRequest.create({ data: { ...input, submissionKey, referenceNumber: `PRV-${randomUUID().toUpperCase()}`, customerId: actor.customerId, contactEmail: session.customer.email, createdAt: now, dueAt: privacyDeadline(now) } });
    });
  }
  list(customerId: string) {
    return this.prisma.customerPrivacyRequest.findMany({ where: { customerId }, orderBy: { createdAt: "desc" }, select: { id: true, referenceNumber: true, kind: true, status: true, details: true, correction: true, response: true, outcome: true, createdAt: true, dueAt: true, resolvedAt: true, contentPurgedAt: true } });
  }
  listOwner(page: number) {
    return this.prisma.customerPrivacyRequest.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21, skip: (page - 1) * 20 });
  }
  getOwnerDetail(id: string) {
    return this.prisma.customerPrivacyRequest.findUnique({ where: { id }, select: {
      id: true, referenceNumber: true, customerId: true, kind: true, status: true,
      details: true, correction: true, contactEmail: true, response: true, outcome: true,
      createdAt: true, dueAt: true, resolvedAt: true, contentDeleteAt: true, receiptDeleteAt: true,
      contentPurgedAt: true, holdCategory: true, holdReason: true, holdReviewAt: true,
    } });
  }
  async listOwnerFiltered(query: OwnerPrivacyListQuery) {
    const where: Prisma.CustomerPrivacyRequestWhereInput = query.status ? { status: query.status } : {};
    const [rows, filteredTotal] = await Promise.all([
      this.prisma.customerPrivacyRequest.findMany({ where, orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip: (query.page - 1) * 20, take: 21, select: { id: true, referenceNumber: true, kind: true, status: true, createdAt: true, dueAt: true, resolvedAt: true, contentPurgedAt: true } }),
      this.prisma.customerPrivacyRequest.count({ where }),
    ]);
    return { items: rows.slice(0, 20), hasNext: rows.length > 20, filteredTotal, page: query.page };
  }
  async handle(input: z.infer<typeof privacyOwnerSchema>, ownerId: string, now: Date) {
    return this.prisma.$transaction(async tx => {
      await lockCustomerLifecycle(tx);
      await tx.$queryRaw`SELECT id FROM customer_privacy_requests WHERE id = ${input.id}::uuid FOR UPDATE`;
      const row = await tx.customerPrivacyRequest.findUnique({ where: { id: input.id } });
      if (!row || row.contentPurgedAt) throw appError("NOT_FOUND");
      // Repeated completion cannot restart either deadline. A resolved case
      // cannot reopen; a new issue must have a new receipt/deadline.
      if (row.resolvedAt && input.status !== "RESOLVED") throw appError("CONFLICT");
      if (row.resolvedAt && (row.response !== input.response || row.outcome !== input.outcome)) throw appError("CONFLICT");
      if (input.applyProfileCorrection) {
        if (row.resolvedAt || row.kind !== "CORRECTION" || !row.customerId) throw appError("CONFLICT");
        // Explicit Owner action changes only the live profile name.
        await tx.customer.update({ where: { id: row.customerId }, data: { displayName: input.correctedDisplayName } });
      }
      const reviewAt = input.holdCategory ? new Date(`${input.holdReviewAt}T16:59:59.999Z`) : null;
      if (reviewAt && (Number.isNaN(reviewAt.getTime()) || reviewAt <= now || reviewAt.getTime() > now.getTime() + 30 * DAY_MS)) throw appError("VALIDATION_ERROR", { details: { holdReviewAt: "Tanggal peninjauan harus dalam 30 hari ke depan." } });
      const resolvedAt = row.resolvedAt ?? (input.status === "RESOLVED" ? now : null);
      const result = await tx.customerPrivacyRequest.update({ where: { id: row.id }, data: { status: input.status, response: input.response, outcome: input.outcome || null, handledBy: ownerId, resolvedAt,
        ...(resolvedAt ? { contentDeleteAt: new Date(resolvedAt.getTime() + 7 * DAY_MS), receiptDeleteAt: new Date(resolvedAt.getTime() + 30 * DAY_MS) } : {}),
        holdCategory: input.holdCategory || null, holdReason: input.holdCategory ? input.holdReason : null, holdOwnerId: input.holdCategory ? ownerId : null, holdReviewAt: reviewAt } });
      await tx.auditLog.create({ data: { actorType: "ADMIN", actorId: ownerId, entityType: "CUSTOMER_PRIVACY_REQUEST", entityId: row.id, action: "PRIVACY_REQUEST_HANDLED", metadataJson: { status: result.status, result: result.outcome, operation: result.holdCategory ? "hold" : "response" } } });
      return result;
    });
  }
}

// Explicit projections prevent new schema fields from silently entering exports.
export async function exportCustomerData(tx: Prisma.TransactionClient, customerId: string, now: Date) {
  const profile = await tx.customer.findUniqueOrThrow({ where: { id: customerId }, select: { id: true, email: true, displayName: true, avatarUrl: true, emailVerifiedAt: true, createdAt: true, internalTestExpiresAt: true, googleSubject: true, consents: { select: { termsVersion: true, privacyVersion: true, acceptedAt: true } } } });
  const orders = await tx.order.findMany({ where: { customerId }, orderBy: { createdAt: "asc" }, select: { orderNumber: true, orderType: true, status: true, customerName: true, customerEmail: true, customerPhone: true, createdAt: true, itemsSubtotalRp: true, shippingTotalRp: true, grandTotalRp: true, address: { select: { recipientName: true, phone: true, addressLine: true, district: true, city: true, province: true, postalCode: true, countryCode: true } }, items: { select: { itemType: true, nameSnapshot: true, skuSnapshot: true, quantity: true, unitPriceRp: true, lineTotalRp: true } }, paymentAttempts: { select: { purpose: true, amountRp: true, status: true, createdAt: true, settledAt: true } }, shipments: { select: { status: true, courierCode: true, serviceCode: true, trackingNumber: true } } } });
  const inquiries = await tx.b2BInquiry.findMany({ where: { customerId }, select: { referenceNumber: true, name: true, email: true, phone: true, company: true, projectGoal: true, currentStage: true, description: true, targetQuantity: true, targetDeadline: true, status: true, createdAt: true, quotes: { where: { status: { not: "DRAFT" } }, select: { version: true, status: true, scope: true, assumptions: true, totalRp: true, validUntil: true, sentAt: true, decidedAt: true } } } });
  const customPrint = await tx.customPrintRequest.findMany({ where: { customerId }, select: { referenceNumber: true, customerName: true, customerEmail: true, customerPhone: true, materialRequested: true, quantity: true, notes: true, intakeMode: true, status: true, createdAt: true, files: { where: { file: { uploadedByCustomerId: customerId } }, select: { file: { select: { id: true, originalName: true, extension: true, mimeType: true, sizeBytes: true, uploadStatus: true, createdAt: true, deletedAt: true } } } }, quotes: { where: { status: { not: "DRAFT" } }, select: { quoteNumber: true, version: true, status: true, finalTotalRp: true, expiresAt: true, sentAt: true } } } });
  const files = await tx.storedFile.findMany({ where: { uploadedByCustomerId: customerId }, select: { id: true, originalName: true, extension: true, mimeType: true, sizeBytes: true, uploadStatus: true, createdAt: true, deletedAt: true } });
  const requests = await tx.customerPrivacyRequest.findMany({ where: { customerId }, select: { referenceNumber: true, kind: true, status: true, details: true, correction: true, response: true, outcome: true, createdAt: true, dueAt: true, resolvedAt: true } });
  return { schemaVersion: "niuva.customer-data.v1", generatedAt: now.toISOString(), scope: "Data milik Customer pada aplikasi Niuva; komunikasi eksternal dan salinan provider dapat diminta terpisah.", profile, orders, inquiries, customPrint, files, privacyRequests: requests };
}
export function serializePrivacyExport(data: unknown): string { return JSON.stringify(data, (_key, value: unknown) => typeof value === "bigint" ? value.toString() : value, 2); }
