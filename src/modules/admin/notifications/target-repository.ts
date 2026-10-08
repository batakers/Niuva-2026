import type { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import type { ActivityDestination, ActivityTargetInput, ActivityTargetReader } from "./target";

export class PrismaActivityTargetReader implements ActivityTargetReader {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async lookup(event: ActivityTargetInput): Promise<ActivityDestination | null> {
    const id = event.entityId;
    // The historical webhook audit contract stores orderId as PaymentEvent.entityId.
    if (["Order", "RetailOrder", "CustomOrder"].includes(event.entityType) || (event.entityType === "PaymentEvent" && event.action === "payment.webhook.processed")) {
      const row = await this.prisma.order.findFirst({ where: { id, accountClosedAt: null }, select: { id: true } });
      return row ? { kind: "order", id: row.id } : null;
    }
    switch (event.entityType) {
      case "Invoice": {
        const row = await this.prisma.invoice.findFirst({ where: { id, billingCase: { accountClosedAt: null } }, select: { id: true } });
        return row ? { kind: "invoice", id: row.id } : null;
      }
      case "Expense": case "ExpenseEntry": {
        const row = await this.prisma.expenseEntry.findUnique({ where: { id }, select: { id: true } });
        return row ? { kind: "expense", id: row.id } : null;
      }
      case "ManualB2BPaymentEntry": {
        const row = await this.prisma.manualB2BPaymentEntry.findUnique({ where: { id }, select: { id: true } });
        return row ? { kind: "payment", id: row.id } : null;
      }
      case "B2BBillingTerms": {
        const row = await this.prisma.billingCase.findFirst({ where: { id, accountClosedAt: null }, select: { inquiryId: true } });
        return row?.inquiryId ? { kind: "billing", id: row.inquiryId } : null;
      }
      case "BillingInstructions": {
        const row = await this.prisma.billingInstructions.findUnique({ where: { id }, select: { id: true } });
        return row ? { kind: "billing-settings", id: row.id } : null;
      }
      case "SiteInformation": {
        const row = await this.prisma.siteInformation.findUnique({ where: { id }, select: { id: true } });
        return row ? { kind: "site-information", id: row.id } : null;
      }
      case "PaymentAttempt": {
        const row = await this.prisma.paymentAttempt.findFirst({ where: { id, order: { accountClosedAt: null } }, select: { order: { select: { id: true } } } });
        return row ? { kind: "order", id: row.order.id } : null;
      }
      case "PaymentEvent": {
        const row = await this.prisma.paymentEvent.findFirst({ where: { id, paymentAttempt: { order: { accountClosedAt: null } } }, select: { paymentAttempt: { select: { orderId: true } } } });
        return row?.paymentAttempt ? { kind: "order", id: row.paymentAttempt.orderId } : null;
      }
      case "B2BInquiry": {
        const row = await this.prisma.b2BInquiry.findFirst({ where: { id, accountClosedAt: null }, select: { id: true } });
        return row ? { kind: "inquiry", id: row.id } : null;
      }
      case "B2BQuote": {
        const row = await this.prisma.b2BQuote.findFirst({ where: { id, inquiry: { accountClosedAt: null } }, select: { inquiry: { select: { id: true } } } });
        return row ? { kind: "proposal", id: row.inquiry.id } : null;
      }
      case "CustomPrintRequest": {
        const row = await this.prisma.customPrintRequest.findFirst({ where: { id, accountClosedAt: null }, select: { id: true } });
        return row ? { kind: "custom-print", id: row.id } : null;
      }
      case "CustomPrintQuote": {
        const row = await this.prisma.customPrintQuote.findFirst({ where: { id, request: { accountClosedAt: null } }, select: { request: { select: { id: true } } } });
        return row ? { kind: "review", id: row.request.id } : null;
      }
      case "CustomPrintReview": {
        const row = await this.prisma.customPrintReview.findFirst({ where: { id, request: { accountClosedAt: null } }, select: { requestId: true } });
        return row ? { kind: "review", id: row.requestId } : null;
      }
      case "Product": case "ProductMedia": {
        const row = event.entityType === "Product" ? await this.prisma.product.findFirst({ where: { id }, select: { id: true } }) : await this.prisma.productMedia.findFirst({ where: { id }, select: { productId: true } }).then(value => value ? { id: value.productId } : null);
        return row ? { kind: "product", id: row.id } : null;
      }
      case "ProductVariant": {
        const row = await this.prisma.productVariant.findFirst({ where: { id }, select: { productId: true } });
        return row ? { kind: "product", id: row.productId } : null;
      }
      case "PortfolioProject": {
        const row = await this.prisma.portfolioProject.findFirst({ where: { id }, select: { id: true } });
        return row ? { kind: "portfolio", id: row.id } : null;
      }
      case "Shipment": {
        const row = await this.prisma.shipment.findFirst({ where: { id, order: { accountClosedAt: null } }, select: { orderId: true } });
        return row ? { kind: "order", id: row.orderId } : null;
      }
      case "StoredFile": {
        const inquiry = await this.prisma.b2BInquiryFile.findFirst({ where: { fileId: id, inquiry: { accountClosedAt: null } }, select: { inquiryId: true } });
        if (inquiry) return { kind: "inquiry", id: inquiry.inquiryId };
        const request = await this.prisma.customPrintRequestFile.findFirst({ where: { fileId: id, request: { accountClosedAt: null } }, select: { requestId: true } });
        return request ? { kind: "custom-print", id: request.requestId } : null;
      }
      case "AdminProfile": case "AdminInvitation": {
        const row = event.entityType === "AdminProfile" ? await this.prisma.adminProfile.findFirst({ where: { id }, select: { id: true } }) : await this.prisma.adminInvitation.findFirst({ where: { id }, select: { id: true } });
        return row ? { kind: "admins", id: row.id } : null;
      }
      case "PricingRuleVersion": {
        const row = await this.prisma.pricingRuleVersion.findFirst({ where: { id }, select: { id: true } });
        return row ? { kind: "pricing", id: row.id } : null;
      }
      case "CUSTOMER_PRIVACY_REQUEST": {
        const row = await this.prisma.customerPrivacyRequest.findFirst({ where: { id }, select: { id: true } });
        return row ? { kind: "privacy", id: row.id } : null;
      }
      default: return null;
    }
  }
}
