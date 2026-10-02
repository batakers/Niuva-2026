import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { getRouteAccessTokenEntityId, issueAccessToken, verifyAccessToken } from "@/modules/shared/access-token";
import { appError } from "@/modules/shared/errors";
import { isEstimateCurrent } from "@/modules/custom-print/estimate";
import { lockCustomerLifecycle } from "@/modules/customer-privacy/lifecycle";

export type ClaimKind = "B2B_INQUIRY" | "CUSTOM_PRINT_REQUEST";

export class CustomerWorkRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async claim(input: Readonly<{ customerId: string; kind: ClaimKind; token: string }>) {
    const id = getRouteAccessTokenEntityId(input.token);
    if (id === null) throw appError("UNAUTHORIZED");

    return this.prisma.$transaction(async (transaction) => {
      await lockCustomerLifecycle(transaction);
      if (!await transaction.customer.findUnique({ where: { id: input.customerId } })) throw appError("UNAUTHORIZED");
      if (input.kind === "B2B_INQUIRY") {
        await transaction.$queryRaw(Prisma.sql`SELECT "id" FROM "b2b_inquiries" WHERE "id" = ${id}::uuid FOR UPDATE`);
        const inquiry = await transaction.b2BInquiry.findUnique({
          where: { id }, select: { customerId: true, accountClosedAt: true, publicTokenHash: true, referenceNumber: true },
        });
        if (inquiry === null || inquiry.customerId !== null || inquiry.accountClosedAt) throw appError("UNAUTHORIZED");
        verifyAccessToken({ entityId: id, expectedHash: inquiry.publicTokenHash, scope: input.kind, token: input.token });
        const replacement = issueAccessToken({ entityId: id, scope: input.kind });
        await transaction.b2BInquiry.update({
          where: { id }, data: { customerId: input.customerId, publicTokenHash: replacement.tokenHash },
        });
        return { id, kind: input.kind, referenceNumber: inquiry.referenceNumber };
      }

      await transaction.$queryRaw(Prisma.sql`SELECT "id" FROM "custom_print_requests" WHERE "id" = ${id}::uuid FOR UPDATE`);
      const request = await transaction.customPrintRequest.findUnique({
        where: { id }, select: { customerId: true, accountClosedAt: true, publicTokenHash: true, referenceNumber: true },
      });
      if (request === null || request.customerId !== null || request.accountClosedAt) throw appError("UNAUTHORIZED");
      verifyAccessToken({ entityId: id, expectedHash: request.publicTokenHash, scope: input.kind, token: input.token });
      await transaction.$queryRaw(Prisma.sql`SELECT "id" FROM "orders" WHERE "id" IN
        (SELECT "order_id" FROM "order_items" WHERE "custom_quote_id" IN
          (SELECT "id" FROM "custom_print_quotes" WHERE "request_id" = ${id}::uuid)) FOR UPDATE`);
      const linkedOrders = await transaction.order.findMany({
        where: { items: { some: { customQuote: { requestId: id } } } }, select: { customerId: true, accountClosedAt: true },
      });
      if (linkedOrders.some((order) => order.accountClosedAt || order.customerId !== null && order.customerId !== input.customerId)) {
        throw appError("CONFLICT", { message: "Order dari request ini sudah dimiliki akun lain." });
      }
      const replacement = issueAccessToken({ entityId: id, scope: input.kind });
      await transaction.customPrintRequest.update({
        where: { id }, data: { customerId: input.customerId, publicTokenHash: replacement.tokenHash },
      });
      await transaction.order.updateMany({
        where: { items: { some: { customQuote: { requestId: id } } }, customerId: null }, data: { customerId: input.customerId },
      });
      return { id, kind: input.kind, referenceNumber: request.referenceNumber };
    });
  }

  async list(customerId: string) {
    const [inquiries, requests] = await Promise.all([
      this.prisma.b2BInquiry.findMany({
        where: { customerId }, orderBy: { createdAt: "desc" },
        select: { id: true, referenceNumber: true, status: true, createdAt: true,
          quotes: { where: { status: { not: "DRAFT" } }, orderBy: { version: "desc" }, take: 1,
            select: { id: true, status: true, version: true } } },
      }),
      this.prisma.customPrintRequest.findMany({
        where: { customerId }, orderBy: { createdAt: "desc" },
        select: { id: true, referenceNumber: true, status: true, intakeMode: true, createdAt: true,
          customerPreviewSnapshot: true,
          review: { select: { updatedAt: true } },
          quotes: { where: { status: { not: "DRAFT" } }, orderBy: { version: "desc" }, take: 1,
            select: { id: true, status: true, version: true } },
          estimates: { orderBy: { version: "desc" }, take: 1,
            select: { lowerRp: true, upperRp: true, version: true, snapshot: true } } },
      }),
    ]);
    return { inquiries, requests: requests.map((request) => ({ ...request,
      estimates: request.estimates.filter((estimate) => isEstimateCurrent(estimate.snapshot, request.review?.updatedAt)) })) };
  }

  async inquiry(customerId: string, id: string) {
    return this.prisma.b2BInquiry.findFirst({
      where: { id, customerId },
      select: { id: true, referenceNumber: true, status: true, projectGoal: true, description: true,
        currentStage: true, targetDeadline: true, createdAt: true,
        quotes: { orderBy: { version: "desc" }, select: { id: true, version: true, status: true, scope: true,
          assumptions: true, lineItems: true, totalRp: true, validUntil: true, sentAt: true, decidedAt: true } } },
    });
  }

  async request(customerId: string, id: string) {
    return this.prisma.customPrintRequest.findFirst({
      where: { id, customerId },
      select: { id: true, referenceNumber: true, status: true, intakeMode: true, referenceLink: true,
        notes: true, materialRequested: true, quantity: true, estimatedPackage: true,
        customerPreviewSnapshot: true, createdAt: true,
        review: { select: { updatedAt: true } },
        files: { select: { file: { select: { extension: true, uploadStatus: true } } } },
        estimates: { orderBy: { version: "desc" }, take: 1, select: { id: true, version: true, lowerRp: true,
          upperRp: true, snapshot: true, publishedAt: true } },
        quotes: { orderBy: { version: "desc" }, select: { id: true, version: true, status: true,
          quoteNumber: true, estimateId: true, finalTotalRp: true, expiresAt: true, sentAt: true,
          materialSubtotalRp: true, machineSubtotalRp: true, additionalSubtotalRp: true,
          calculationSnapshot: true } } },
    });
  }
}
