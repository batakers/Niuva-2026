import type { ActionQueueResult } from "./action-queue";
import type { AdminActivityPage } from "./activity-timeline";
import type { FinanceSummary } from "@/modules/finance/types";
import type { ReportRange } from "@/modules/analytics/contract";
import type { DataSection, TrafficSection } from "./reports/types";
export type AdminOverviewData = { range: ReportRange; generatedAt: string; attention: DataSection<ActionQueueResult>; finance: DataSection<FinanceSummary>; paidOrders: DataSection<number>; activity: DataSection<AdminActivityPage>; traffic: DataSection<TrafficSection> };
