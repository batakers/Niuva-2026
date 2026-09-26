import type { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import type { DashboardSource, DashboardWindow } from "./dashboard";

export interface DashboardReader {
  load(window: DashboardWindow): Promise<DashboardSource>;
}

export class PrismaDashboardRepository implements DashboardReader {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async load(window: DashboardWindow): Promise<DashboardSource> {
    const createdWithinWindow = { gte: window.start, lt: window.end };
    const [
      newInquiries,
      submittedCustomPrint,
      paidOrders,
      inquiries,
      customPrintRequests,
      orders,
    ] = await Promise.all([
      this.prisma.b2BInquiry.count({ where: { status: "NEW" } }),
      this.prisma.customPrintRequest.count({ where: { status: "SUBMITTED" } }),
      this.prisma.order.count({ where: { status: "PAID" } }),
      this.prisma.b2BInquiry.findMany({
        where: { createdAt: createdWithinWindow },
        select: { createdAt: true },
      }),
      this.prisma.customPrintRequest.findMany({
        where: { createdAt: createdWithinWindow },
        select: { createdAt: true },
      }),
      this.prisma.order.findMany({
        where: { createdAt: createdWithinWindow },
        select: { createdAt: true },
      }),
    ]);

    return {
      newInquiries,
      submittedCustomPrint,
      paidOrders,
      inquiryCreatedAt: inquiries.map((record) => record.createdAt),
      customPrintCreatedAt: customPrintRequests.map((record) => record.createdAt),
      orderCreatedAt: orders.map((record) => record.createdAt),
    };
  }
}
