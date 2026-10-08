import type { AdminReadPage } from "@/modules/admin/operations-read-repository";

export type CustomerHistoryTab = "orders" | "custom-print" | "inquiries" | "invoices";
export type CustomerDirectoryQuery = Readonly<{ page: number; q?: string; tab: CustomerHistoryTab }>;
export type CustomerDirectoryRow = Readonly<{ id: string; displayName: string | null; email: string; orderCount: number; customPrintCount: number; inquiryCount: number }>;
export type CustomerHistoryRow = Readonly<{ id: string; reference: string; status: string; createdAt: Date; href: string }>;
export type CustomerDirectoryDetail = Readonly<{
  customer: CustomerDirectoryRow & { createdAt: Date };
  orders: AdminReadPage<CustomerHistoryRow>;
  customPrint: AdminReadPage<CustomerHistoryRow>;
  inquiries: AdminReadPage<CustomerHistoryRow>;
  invoices: AdminReadPage<CustomerHistoryRow>;
  query: CustomerDirectoryQuery;
}>;
