import type { PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { dateColumn, jakartaDayKey, type DeviceKind, type PageViewPayload, type ReportWindow } from "./contract";

export type TrafficRow = Readonly<{
  day: Date;
  routeGroup: string;
  source: string;
  device: string;
  country: string;
  landing: boolean;
  viewCount: number;
}>;

export type BusinessRows = Readonly<{
  briefs: readonly Date[];
  customPrint: readonly Date[];
  paidOrders: readonly Date[];
}>;

export interface AnalyticsRepository {
  increment(payload: PageViewPayload, device: DeviceKind, country: string, now: Date): Promise<void>;
  traffic(window: ReportWindow): Promise<readonly TrafficRow[]>;
  business(window: ReportWindow): Promise<BusinessRows>;
  deleteBefore(firstDay: string): Promise<number>;
}

export class PrismaAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async increment(payload: PageViewPayload, device: DeviceKind, country: string, now: Date): Promise<void> {
    const key = {
      day: dateColumn(jakartaDayKey(now)),
      routeGroup: payload.routeGroup,
      source: payload.source,
      device,
      country,
      landing: payload.landing,
    };
    await this.prisma.analyticsDailyPageView.upsert({
      where: { day_routeGroup_source_device_country_landing: key },
      create: { ...key, viewCount: 1 },
      update: { viewCount: { increment: 1 } },
    });
  }

  async traffic(window: ReportWindow): Promise<readonly TrafficRow[]> {
    return this.prisma.analyticsDailyPageView.findMany({
      where: {
        day: { gte: dateColumn(window.firstDay), lt: dateColumn(jakartaDayKey(window.end)) },
      },
      select: {
        day: true, routeGroup: true, source: true, device: true,
        country: true, landing: true, viewCount: true,
      },
    });
  }

  async business(window: ReportWindow): Promise<BusinessRows> {
    const withinWindow = { gte: window.start, lt: window.end };
    const [briefs, customPrint, paidOrders] = await Promise.all([
      this.prisma.b2BInquiry.findMany({ where: { createdAt: withinWindow }, select: { createdAt: true } }),
      this.prisma.customPrintRequest.findMany({ where: { createdAt: withinWindow }, select: { createdAt: true } }),
      this.prisma.order.findMany({ where: { paidAt: withinWindow }, select: { paidAt: true } }),
    ]);
    return {
      briefs: briefs.map((row) => row.createdAt),
      customPrint: customPrint.map((row) => row.createdAt),
      paidOrders: paidOrders.flatMap((row) => row.paidAt === null ? [] : [row.paidAt]),
    };
  }

  async deleteBefore(firstDay: string): Promise<number> {
    const result = await this.prisma.analyticsDailyPageView.deleteMany({
      where: { day: { lt: dateColumn(firstDay) } },
    });
    return result.count;
  }
}
