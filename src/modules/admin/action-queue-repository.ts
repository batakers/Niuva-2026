import type { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { getPaymentIssues } from "@/modules/payment/operational-state";
import { operationalPaymentSelect, paymentIssueCandidateWhere } from "@/modules/payment/operational-repository";

import type { ActionQueueSignal } from "./action-queue";

export interface ActionQueueSignalReader {
  listSignals(): Promise<readonly ActionQueueSignal[]>;
}

export class PrismaActionQueueRepository
  implements ActionQueueSignalReader
{
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async listSignals(): Promise<readonly ActionQueueSignal[]> {
    const [
      newInquiries,
      submittedCustomPrintRequests,
      quoteReadyRequests,
      draftQuotes,
      orderSignals,
      shippingExceptions,
    ] = await Promise.all([
      this.prisma.b2BInquiry.findMany({
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          referenceNumber: true,
          updatedAt: true,
        },
        where: { status: "NEW", accountClosedAt: null },
      }),
      this.prisma.customPrintRequest.findMany({
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          referenceNumber: true,
          updatedAt: true,
        },
        where: { status: "SUBMITTED", accountClosedAt: null },
      }),
      this.prisma.customPrintRequest.findMany({
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          referenceNumber: true,
          updatedAt: true,
        },
        where: {
          accountClosedAt: null,
          quotes: { none: { status: "DRAFT" } },
          status: "QUOTE_READY",
        },
      }),
      this.prisma.customPrintQuote.findMany({
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: {
          createdAt: true,
          id: true,
          quoteNumber: true,
          requestId: true,
        },
        where: { status: "DRAFT", request: { accountClosedAt: null } },
      }),
      this.prisma.order.findMany({
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          orderNumber: true,
          orderType: true,
          paymentAttempts: { select: operationalPaymentSelect },
          status: true,
          updatedAt: true,
        },
        where: {
          accountClosedAt: null,
          OR: [
            { status: "PAID" },
            { orderType: "CUSTOM_PRINT", status: "FINISHING_QC" },
            paymentIssueCandidateWhere,
          ],
        },
      }),
      this.prisma.shipment.findMany({
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          orderId: true,
          order: {
            select: {
              orderNumber: true,
            },
          },
          updatedAt: true,
        },
        where: { status: "EXCEPTION", order: { accountClosedAt: null } },
      }),
    ]);

    const paymentSignals = orderSignals.flatMap((record): ActionQueueSignal[] => {
      const issues = getPaymentIssues(record.status, record.paymentAttempts);
      if (issues.length === 0) return [];
      const oldest = issues.reduce((left, right) => left.occurredAt <= right.occurredAt ? left : right);
      return [{ entityId: record.id, kind: "PAYMENT_EXCEPTION", reference: record.orderNumber, sourceUpdatedAt: oldest.occurredAt }];
    });
    const heldOrders = new Set(paymentSignals.map((signal) => signal.entityId));

    return [
      ...newInquiries.map(
        (record): ActionQueueSignal => ({
          entityId: record.id,
          kind: "B2B_INQUIRY",
          reference: record.referenceNumber,
          sourceUpdatedAt: record.updatedAt,
        }),
      ),
      ...submittedCustomPrintRequests.map(
        (record): ActionQueueSignal => ({
          entityId: record.id,
          kind: "CUSTOM_PRINT_REVIEW",
          reference: record.referenceNumber,
          sourceUpdatedAt: record.updatedAt,
        }),
      ),
      ...quoteReadyRequests.map(
        (record): ActionQueueSignal => ({
          entityId: record.id,
          kind: "QUOTE_PREPARATION",
          reference: record.referenceNumber,
          sourceUpdatedAt: record.updatedAt,
          workflowKey: record.id,
        }),
      ),
      ...draftQuotes.map(
        (record): ActionQueueSignal => ({
          entityId: record.id,
          kind: "QUOTE_SEND",
          reference: record.quoteNumber,
          sourceUpdatedAt: record.createdAt,
          targetId: record.requestId,
          workflowKey: record.requestId,
        }),
      ),
      ...orderSignals
        .filter((record) => record.status === "PAID" && !heldOrders.has(record.id))
        .map(
          (record): ActionQueueSignal => ({
            entityId: record.id,
            kind: "ORDER_PROCESSING",
            reference: record.orderNumber,
            sourceUpdatedAt: record.updatedAt,
          }),
        ),
      ...orderSignals
        .filter(
          (record) =>
            record.orderType === "CUSTOM_PRINT" &&
            record.status === "FINISHING_QC" && !heldOrders.has(record.id),
        )
        .map(
          (record): ActionQueueSignal => ({
            entityId: record.id,
            kind: "PACKAGE_MEASUREMENT",
            reference: record.orderNumber,
            sourceUpdatedAt: record.updatedAt,
          }),
        ),
      ...shippingExceptions.map(
        (record): ActionQueueSignal => ({
          entityId: record.id,
          kind: "SHIPPING_EXCEPTION",
          reference: record.order.orderNumber,
          sourceUpdatedAt: record.updatedAt,
          targetId: record.orderId,
        }),
      ),
      ...paymentSignals,
    ];
  }
}
