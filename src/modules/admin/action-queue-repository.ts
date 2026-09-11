import type { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";

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
        where: { status: "NEW" },
      }),
      this.prisma.customPrintRequest.findMany({
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          referenceNumber: true,
          updatedAt: true,
        },
        where: { status: "SUBMITTED" },
      }),
      this.prisma.customPrintRequest.findMany({
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          referenceNumber: true,
          updatedAt: true,
        },
        where: {
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
        where: { status: "DRAFT" },
      }),
      this.prisma.order.findMany({
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          orderNumber: true,
          orderType: true,
          status: true,
          updatedAt: true,
        },
        where: {
          OR: [
            { status: "PAID" },
            { orderType: "CUSTOM_PRINT", status: "FINISHING_QC" },
          ],
        },
      }),
      this.prisma.shipment.findMany({
        orderBy: [{ updatedAt: "asc" }, { id: "asc" }],
        select: {
          id: true,
          order: {
            select: {
              orderNumber: true,
            },
          },
          updatedAt: true,
        },
        where: { status: "EXCEPTION" },
      }),
    ]);

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
          workflowKey: record.requestId,
        }),
      ),
      ...orderSignals
        .filter((record) => record.status === "PAID")
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
            record.status === "FINISHING_QC",
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
        }),
      ),
    ];
  }
}
