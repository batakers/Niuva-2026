import { reportKey, reportWindow, type ReportRange, type ReportWindow } from "./contract";
import {
  PrismaAnalyticsRepository, type AnalyticsRepository, type BusinessRows, type TrafficRow,
} from "./repository";

type MutablePoint = {
  key: string;
  pageViews: number;
  briefs: number;
  customPrint: number;
  paidOrders: number;
};
export type ReportPoint = Readonly<MutablePoint>;

export type Breakdown = Readonly<{ key: string; count: number }>;
export type BusinessReport = Readonly<{
  briefs: number;
  customPrint: number;
  paidOrders: number;
  points: readonly ReportPoint[];
}>;
export type TrafficReport = Readonly<{
  pageViews: number;
  points: readonly ReportPoint[];
  sources: readonly Breakdown[];
  devices: readonly Breakdown[];
  countries: readonly Breakdown[];
  routes: readonly Breakdown[];
}>;
export type AnalyticsReport = Readonly<{
  generatedAt: Date;
  range: ReportRange;
  window: ReportWindow;
  business: BusinessReport | null;
  traffic: TrafficReport | null;
  collectionEnabled: boolean;
}>;

const makePoints = (keys: readonly string[]): MutablePoint[] =>
  keys.map((key) => ({ key, pageViews: 0, briefs: 0, customPrint: 0, paidOrders: 0 }));

export function projectBusiness(rows: BusinessRows, window: ReportWindow): BusinessReport {
  const points = makePoints(window.keys);
  const byKey = new Map(points.map((point) => [point.key, point]));
  const add = (dates: readonly Date[], field: "briefs" | "customPrint" | "paidOrders") => {
    for (const date of dates) {
      const point = byKey.get(reportKey(date, window.range));
      if (point) point[field] += 1;
    }
  };
  add(rows.briefs, "briefs");
  add(rows.customPrint, "customPrint");
  add(rows.paidOrders, "paidOrders");
  return {
    briefs: rows.briefs.length,
    customPrint: rows.customPrint.length,
    paidOrders: rows.paidOrders.length,
    points,
  };
}

export function projectTraffic(rows: readonly TrafficRow[], window: ReportWindow): TrafficReport {
  const points = makePoints(window.keys);
  const byKey = new Map(points.map((point) => [point.key, point]));
  const sources = new Map<string, number>();
  const devices = new Map<string, number>();
  const countries = new Map<string, number>();
  const routes = new Map<string, number>();
  let pageViews = 0;
  for (const row of rows) {
    const day = row.day.toISOString().slice(0, 10);
    const key = window.range === "13m" ? day.slice(0, 7) : day;
    const point = byKey.get(key);
    if (!point) continue;
    point.pageViews += row.viewCount;
    pageViews += row.viewCount;
    devices.set(row.device, (devices.get(row.device) ?? 0) + row.viewCount);
    countries.set(row.country, (countries.get(row.country) ?? 0) + row.viewCount);
    routes.set(row.routeGroup, (routes.get(row.routeGroup) ?? 0) + row.viewCount);
    if (row.landing) sources.set(row.source, (sources.get(row.source) ?? 0) + row.viewCount);
  }
  const sorted = (values: Map<string, number>): Breakdown[] =>
    [...values].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return {
    pageViews, points, sources: sorted(sources), devices: sorted(devices),
    countries: sorted(countries), routes: sorted(routes),
  };
}

export class AnalyticsService {
  constructor(
    private readonly repository: AnalyticsRepository = new PrismaAnalyticsRepository(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async load(range: ReportRange): Promise<AnalyticsReport> {
    const generatedAt = this.now();
    const window = reportWindow(range, generatedAt);
    const [business, traffic] = await Promise.allSettled([
      this.repository.business(window),
      this.repository.traffic(window),
    ]);
    return {
      generatedAt, range, window,
      business: business.status === "fulfilled" ? projectBusiness(business.value, window) : null,
      traffic: traffic.status === "fulfilled" ? projectTraffic(traffic.value, window) : null,
      collectionEnabled: process.env.NIUVA_ANALYTICS_ENABLED === "true",
    };
  }

  async deleteExpired(): Promise<number> {
    return this.repository.deleteBefore(reportWindow("13m", this.now()).firstDay);
  }
}
