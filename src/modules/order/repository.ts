import type {
  OrderStatus,
  OrderType,
  Prisma,
  PrismaClient,
} from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";

export type OrderMutationState = Readonly<{
  id: string;
  orderType: OrderType;
  shipment: Readonly<{ courierCode: string | null; trackingNumber: string | null }> | null;
  status: OrderStatus;
}>;

export type OrderTokenForReissue = Readonly<{
  id: string;
  orderNumber: string;
  publicTokenHash: string;
  status: OrderStatus;
}>;

export class OrderRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async findForPublicStatus(publicTokenHash: string) {
    return this.prisma.order.findUnique({
      where: { publicTokenHash },
      select: {
        cancelledAt: true,
        completedAt: true,
        createdAt: true,
        grandTotalRp: true,
        items: {
          select: {
            lineTotalRp: true,
            nameSnapshot: true,
            quantity: true,
          },
        },
        orderNumber: true,
        orderType: true,
        paymentAttempts: {
          orderBy: { createdAt: "desc" },
          select: {
            expiresAt: true,
            provider: true,
            purpose: true,
            redirectUrl: true,
            snapToken: true,
            status: true,
          },
        },
        paidAt: true,
        shipments: {
          orderBy: { updatedAt: "desc" },
          select: {
            status: true,
            trackingNumber: true,
          },
        },
        status: true,
      },
    });
  }

  async findForPublicStatusById(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        cancelledAt: true,
        completedAt: true,
        createdAt: true,
        grandTotalRp: true,
        items: {
          select: {
            lineTotalRp: true,
            nameSnapshot: true,
            quantity: true,
          },
        },
        orderNumber: true,
        orderType: true,
        paymentAttempts: {
          orderBy: { createdAt: "desc" },
          select: {
            expiresAt: true,
            provider: true,
            purpose: true,
            redirectUrl: true,
            snapToken: true,
            status: true,
          },
        },
        paidAt: true,
        publicTokenHash: true,
        shipments: {
          orderBy: { updatedAt: "desc" },
          select: {
            status: true,
            trackingNumber: true,
          },
        },
        status: true,
      },
    });
  }

  async findStatusForMutation(orderId: string): Promise<OrderMutationState | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderType: true,
        shipments: {
          orderBy: { updatedAt: "desc" },
          select: { courierCode: true, trackingNumber: true },
          take: 1,
        },
        status: true,
      },
    });

    if (order === null) return null;
    return {
      id: order.id,
      orderType: order.orderType,
      shipment: order.shipments[0] ?? null,
      status: order.status,
    };
  }

  async updateStatusIfCurrent(
    orderId: string,
    currentStatus: OrderStatus,
    nextStatus: OrderStatus,
    timestamp: Date,
  ): Promise<OrderMutationState | null> {
    const updated = await this.prisma.order.updateMany({
      where: { id: orderId, status: currentStatus },
      data: orderStatusData(nextStatus, timestamp),
    });

    if (updated.count === 0) {
      return null;
    }

    return this.findStatusForMutation(orderId);
  }

  async findForCommercialOperation(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        address: true,
        items: true,
        paymentAttempts: {
          orderBy: { createdAt: "desc" },
        },
        reservations: {
          orderBy: { createdAt: "asc" },
        },
        shipmentRates: {
          orderBy: { selectedAt: "desc" },
        },
      },
    });
  }

  async findForTokenReissue(orderId: string): Promise<OrderTokenForReissue | null> {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderNumber: true, publicTokenHash: true, status: true },
    });
  }

  async replacePublicTokenHash(
    orderId: string,
    currentHash: string,
    nextHash: string,
  ): Promise<boolean> {
    const updated = await this.prisma.order.updateMany({
      where: { id: orderId, publicTokenHash: currentHash },
      data: { publicTokenHash: nextHash },
    });
    return updated.count === 1;
  }
}

function orderStatusData(
  status: OrderStatus,
  timestamp: Date,
): Prisma.OrderUpdateManyMutationInput {
  switch (status) {
    case "CANCELLED":
      return { cancelledAt: timestamp, status };
    case "COMPLETED":
      return { completedAt: timestamp, status };
    case "PAID":
      return { paidAt: timestamp, status };
    default:
      return { status };
  }
}
