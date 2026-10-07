import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminOverviewView } from "@/app/admin/overview-view";
import type { ActionQueueResult } from "@/modules/admin/action-queue";
import { dashboardWindow, projectDashboard } from "@/modules/admin/dashboard";
import { reportWindow } from "@/modules/analytics/contract";
import { projectBusiness, projectTraffic } from "@/modules/analytics/service";

vi.mock("@/components/niuva/admin-session-actions", () => ({ AdminSessionActions: () => null }));

describe("AdminOverviewView", () => {
  it("renders an accessible empty operational overview without synthetic fallback", () => {
    const now = new Date("2026-09-25T17:10:00.000Z");
    const queue: ActionQueueResult = {
      summary: { groups: { inquiries: 0, "custom-print": 0, orders: 0 }, exceptions: 0 },
      filteredTotal: 0,
      generatedAt: now,
      group: "all",
      items: [],
      priorityItems: [],
      totalOpen: 0,
    };
    const dashboard = projectDashboard({
      newInquiries: 0,
      submittedCustomPrint: 0,
      paidOrders: 0,
      inquiryCreatedAt: [],
      customPrintCreatedAt: [],
      orderCreatedAt: [],
    }, now, dashboardWindow(now));

    const window = reportWindow("30d", now);
    render(<AdminOverviewView analytics={{
      generatedAt: now,
      range: "30d",
      window,
      business: projectBusiness({ briefs: [], customPrint: [], paidOrders: [] }, window),
      traffic: projectTraffic([], window),
      collectionEnabled: false,
    }} dashboard={dashboard} queue={queue} range="30d" role="OWNER" />);

    expect(document.querySelector("[data-foundation-scope='admin']")).toHaveAttribute("data-product-screen-proof-status", "pending-owner-review");
    expect(screen.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /Jumlah tayangan/ })).toBeInTheDocument();
    expect(screen.getByText("Antrean pekerjaan sedang kosong.")).toBeInTheDocument();
    expect(screen.getByText("pekerjaan terbuka")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /13 bulan/ })).toHaveAttribute("href", "/admin?range=13m");
    expect(screen.queryByText(/DEMO-/)).not.toBeInTheDocument();
    expect(screen.getByText("Pengumpulan tayangan belum aktif. Data historis tetap ditampilkan bila tersedia.")).toBeInTheDocument();
  });

  it("keeps the selected range and queue available when analytics fails", () => {
    const now = new Date("2026-09-25T17:10:00.000Z");
    const queue: ActionQueueResult = {
      summary: { groups: { inquiries: 0, "custom-print": 0, orders: 0 }, exceptions: 0 },
      filteredTotal: 0, generatedAt: now, group: "orders",
      items: [], priorityItems: [], totalOpen: 0,
    };
    const dashboard = projectDashboard({
      newInquiries: 0, submittedCustomPrint: 0, paidOrders: 0,
      inquiryCreatedAt: [], customPrintCreatedAt: [], orderCreatedAt: [],
    }, now, dashboardWindow(now));
    render(<AdminOverviewView analytics={null} dashboard={dashboard} queue={queue} range="13m" role="ADMIN" />);
    expect(screen.getByRole("link", { name: "13 bulan" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "30 hari" })).toHaveAttribute("href", "/admin?group=orders");
    expect(screen.getAllByRole("alert")).toHaveLength(2);
    expect(screen.queryByText("Belum ada data pada periode ini.")).not.toBeInTheDocument();
    expect(screen.getAllByText("Data traffic belum tersedia.")).toHaveLength(5);
    expect(screen.getByText("pekerjaan terbuka")).toBeInTheDocument();
  });
});
