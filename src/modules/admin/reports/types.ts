import type { ReportRange, ReportWindow } from "@/modules/analytics/contract";
import type { BusinessReport, TrafficReport } from "@/modules/analytics/service";
import type { FinanceSummary } from "@/modules/finance/types";
export type DataSection<T> = { status: "ok"; data: T } | { status: "unavailable"; message: string };
export const reportTabs = ["summary", "orders", "custom-print", "b2b", "finance", "traffic"] as const;
export type AdminReportTab = typeof reportTabs[number];
export type OperationsReport = BusinessReport & { createdOrders: number };
export type TrafficSection = { report: TrafficReport; collectionEnabled: boolean };
export type AdminReportsData = { tab: AdminReportTab; range: ReportRange; window: ReportWindow; generatedAt: string; operations: DataSection<OperationsReport>; finance: DataSection<FinanceSummary>; traffic: DataSection<TrafficSection> };
