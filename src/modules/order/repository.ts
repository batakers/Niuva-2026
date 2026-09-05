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
  status: OrderStatus;
}>;

export class OrderRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async findForPublicStatus(publicTokenHash: string) {
    return this.prisma.order.findUnique({
      where: { publicTokenHash },
      select: {
        completedAt: true,
        createdAt: true,
        items: {
          select: {
            lineTotalRp: true,
            nameSnapshot: true,
            quantity: true,
          },
        },
        orderNumber: true,
        orderType: true,
        paidAt: true,
        shipments: {
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
        completedAt: true,
        createdAt: true,
        items: {
          select: {
            lineTotalRp: true,
            nameSnapshot: true,
            quantity: true,
          },
        },
        orderNumber: true,
        orderType: true,
        paidAt: true,
        publicTokenHash: true,
        shipments: {
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
    return this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, orderType: true, status: true },
    });
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
