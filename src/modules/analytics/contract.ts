import { z } from "zod";

export const routeGroups = [
  "home", "services", "service_detail", "projects", "project_detail",
  "shop", "product_detail", "custom_print", "custom_request", "project_brief",
] as const;
export const trafficSources = [
  "direct", "internal", "google", "bing", "instagram", "facebook",
  "youtube", "tiktok", "linkedin", "other_referral",
] as const;
export const deviceKinds = ["desktop", "tablet", "mobile", "unknown"] as const;
export const reportRanges = ["30d", "13m"] as const;

export const pageViewSchema = z.strictObject({
  routeGroup: z.enum(routeGroups),
  source: z.enum(trafficSources),
  landing: z.boolean(),
}).refine((value) => value.landing || value.source === "internal", {
  message: "Perpindahan route harus memakai sumber internal.",
});

export type PageViewPayload = z.infer<typeof pageViewSchema>;
export type RouteGroup = PageViewPayload["routeGroup"];
export type TrafficSource = PageViewPayload["source"];
export type DeviceKind = typeof deviceKinds[number];
export type ReportRange = typeof reportRanges[number];

export function parseReportRange(value: unknown): ReportRange {
  const result = z.enum(reportRanges).safeParse(value);
  return result.success ? result.data : "30d";
}

export function classifyPublicRoute(pathname: string): RouteGroup | null {
  if (pathname === "/") return "home";
  if (pathname === "/services") return "services";
  if (/^\/services\/[^/]+$/.test(pathname)) return "service_detail";
  if (pathname === "/projects") return "projects";
  if (/^\/projects\/[^/]+$/.test(pathname)) return "project_detail";
  if (pathname === "/shop") return "shop";
  if (/^\/shop\/[^/]+$/.test(pathname)) return "product_detail";
  if (pathname === "/custom-print") return "custom_print";
  if (pathname === "/custom-print/request") return "custom_request";
  if (pathname === "/project-brief") return "project_brief";
  return null;
}

export function classifyReferrer(referrer: string, currentOrigin: string): TrafficSource {
  if (!referrer) return "direct";
  try {
    const url = new URL(referrer);
    if (url.origin === currentOrigin) return "internal";
    const host = url.hostname.toLowerCase();
    if (/(^|\.)google\.(?:com|co\.[a-z]{2}|[a-z]{2})$/.test(host)) return "google";
    if (host === "bing.com" || host.endsWith(".bing.com")) return "bing";
    if (host === "instagram.com" || host.endsWith(".instagram.com")) return "instagram";
    if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "fb.com" || host.endsWith(".fb.com")) return "facebook";
    if (host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be") return "youtube";
    if (host === "tiktok.com" || host.endsWith(".tiktok.com")) return "tiktok";
    if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "linkedin";
    return "other_referral";
  } catch {
    return "direct";
  }
}

export function classifyDevice(userAgent: string | null): DeviceKind {
  if (!userAgent) return "unknown";
  if (/ipad|tablet|android(?!.*mobile)/i.test(userAgent)) return "tablet";
  if (/mobi|iphone|ipod/i.test(userAgent)) return "mobile";
  return "desktop";
}

export function countryCode(header: string | null): string {
  return header !== null && /^[A-Za-z]{2}$/.test(header) ? header.toUpperCase() : "ZZ";
}

const DAY_MS = 86_400_000;
const JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;

export function jakartaDayKey(value: Date): string {
  return new Date(value.getTime() + JAKARTA_OFFSET_MS).toISOString().slice(0, 10);
}

export type ReportWindow = Readonly<{
  start: Date;
  end: Date;
  firstDay: string;
  keys: readonly string[];
  range: ReportRange;
}>;

export function reportWindow(range: ReportRange, now: Date): ReportWindow {
  const local = new Date(now.getTime() + JAKARTA_OFFSET_MS);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const day = local.getUTCDate();
  const todayStart = Date.UTC(year, month, day) - JAKARTA_OFFSET_MS;
  const end = new Date(todayStart + DAY_MS);
  if (range === "30d") {
    const start = new Date(todayStart - 29 * DAY_MS);
    return {
      range, start, end, firstDay: jakartaDayKey(start),
      keys: Array.from({ length: 30 }, (_, index) => jakartaDayKey(new Date(start.getTime() + index * DAY_MS))),
    };
  }
  const firstMonth = new Date(Date.UTC(year, month - 12, 1));
  const firstDay = firstMonth.toISOString().slice(0, 10);
  return {
    range, firstDay,
    start: new Date(firstMonth.getTime() - JAKARTA_OFFSET_MS),
    end,
    keys: Array.from({ length: 13 }, (_, index) => new Date(Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + index, 1)).toISOString().slice(0, 7)),
  };
}

export function reportKey(value: Date, range: ReportRange): string {
  const day = jakartaDayKey(value);
  return range === "13m" ? day.slice(0, 7) : day;
}

export function dateColumn(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}
