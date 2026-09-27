import Decimal from "decimal.js";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { z } from "zod";

import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import { getPrismaClient } from "@/lib/db/prisma";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";

export const b2bQuoteLineSchema = z.object({
  name: z.string().trim().min(2).max(120),
  amountRp: z.string().trim().regex(/^[1-9]\d{0,14}$/),
}).strict();
export const sendB2BQuoteSchema = z.object({
  inquiryId: z.uuid(),
  scope: z.string().trim().min(10).max(10_000),
  assumptions: z.string().trim().min(5).max(10_000),
  lineItems: z.array(b2bQuoteLineSchema).min(1).max(30),
  validUntil: z.iso.date(),
}).strict();
export const decideB2BQuoteSchema = z.object({
  inquiryId: z.uuid(), quoteId: z.uuid(), decision: z.enum(["ACCEPTED", "DECLINED"]),
}).strict();

export function totalB2BQuote(lineItems: readonly z.infer<typeof b2bQuoteLineSchema>[]): Decimal {
  return lineItems.reduce((sum, line) => sum.plus(line.amountRp), new Decimal(0));
}

export class B2BQuoteService {
  constructor(private readonly dependencies: Readonly<{
    authorizeAdmin?: () => Promise<AdminAccess>;
    now?: () => Date;
    prisma?: PrismaClient;
  }> = {}) {}

  private get prisma() { return this.dependencies.prisma ?? getPrismaClient(); }
  private get now() { return (this.dependencies.now ?? (() => new Date()))(); }

  async send(input: unknown) {
    const parsed = parseWithValidation(sendB2BQuoteSchema, input);
    const admin = await (this.dependencies.authorizeAdmin ?? requireAdmin)();
    requireAdminPermission(admin, "INQUIRY_MANAGE");
    const now = this.now;
    const validUntil = new Date(`${parsed.validUntil}T23:59:59+07:00`);
    if (!Number.isFinite(validUntil.getTime()) || validUntil <= now) {
      throw appError("VALIDATION_ERROR", { details: { validUntil: "Masa berlaku harus berakhir di masa depan." } });
    }
    const total = totalB2BQuote(parsed.lineItems);
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`SELECT "id" FROM "b2b_inquiries" WHERE "id" = ${parsed.inquiryId}::uuid FOR UPDATE`);
      const inquiry = await transaction.b2BInquiry.findUnique({
        where: { id: parsed.inquiryId }, select: { customerId: true, status: true,
          quotes: { orderBy: { version: "desc" }, take: 1, select: { version: true } } },
      });
      if (inquiry === null) throw appError("NOT_FOUND");
      if (inquiry.customerId === null) throw appError("CONFLICT", { message: "Customer perlu mengklaim inquiry sebelum proposal akun dikirim." });
      if (["WON", "LOST", "CLOSED"].includes(inquiry.status)) throw appError("CONFLICT", { message: "Inquiry sudah ditutup." });
      const version = (inquiry.quotes[0]?.version ?? 0) + 1;
      const quote = await transaction.b2BQuote.create({
        data: { inquiryId: parsed.inquiryId, version, status: "SENT", scope: parsed.scope,
          assumptions: parsed.assumptions, lineItems: parsed.lineItems,
          totalRp: total, validUntil, createdByAdminId: admin.profile.id, sentAt: now },
        select: { id: true, inquiryId: true, version: true, status: true, totalRp: true, validUntil: true },
      });
      return quote;
    });
  }

  async decide(input: unknown, customerId: string) {
    const parsed = parseWithValidation(decideB2BQuoteSchema, input);
    const now = this.now;
    return this.prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`SELECT "id" FROM "b2b_inquiries" WHERE "id" = ${parsed.inquiryId}::uuid FOR UPDATE`);
      const inquiry = await transaction.b2BInquiry.findUnique({
        where: { id: parsed.inquiryId }, select: { customerId: true,
          quotes: { orderBy: { version: "desc" }, take: 1, select: { id: true, version: true } } },
      });
      if (inquiry === null || inquiry.customerId !== customerId) throw appError("NOT_FOUND");
      const quote = await transaction.b2BQuote.findUnique({
        where: { id: parsed.quoteId }, select: { id: true, inquiryId: true, version: true,
          status: true, validUntil: true, decidedByCustomerId: true },
      });
      if (quote === null || quote.inquiryId !== parsed.inquiryId) throw appError("NOT_FOUND");
      if (inquiry.quotes[0]?.id !== quote.id) throw appError("QUOTE_NOT_READY", { message: "Proposal sudah memiliki versi baru." });
      if (quote.status === parsed.decision && quote.decidedByCustomerId === customerId) {
        return { id: quote.id, version: quote.version, status: quote.status };
      }
      if (quote.status !== "SENT" || now >= quote.validUntil) throw appError("QUOTE_NOT_READY", { message: "Proposal tidak lagi dapat diputuskan." });
      const updated = await transaction.b2BQuote.updateMany({
        where: { id: quote.id, inquiryId: parsed.inquiryId, status: "SENT" },
        data: { status: parsed.decision, decidedByCustomerId: customerId, decidedAt: now },
      });
      if (updated.count !== 1) throw appError("CONFLICT");
      return { id: quote.id, version: quote.version, status: parsed.decision };
    });
  }

  async listForAdmin(inquiryId: string) {
    const admin = await (this.dependencies.authorizeAdmin ?? requireAdmin)();
    requireAdminPermission(admin, "INQUIRY_MANAGE");
    return this.prisma.b2BQuote.findMany({ where: { inquiryId }, orderBy: { version: "desc" },
      select: { id: true, version: true, status: true, scope: true, assumptions: true,
        lineItems: true, totalRp: true, validUntil: true, sentAt: true, decidedAt: true } });
  }
}
