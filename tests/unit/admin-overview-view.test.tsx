import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminOverviewView } from "@/app/admin/overview-view";
import type { ActionQueueResult } from "@/modules/admin/action-queue";
import { dashboardWindow, projectDashboard } from "@/modules/admin/dashboard";

vi.mock("@/components/niuva/admin-session-actions", () => ({ AdminSessionActions: () => null }));

describe("AdminOverviewView", () => {
  it("renders an accessible empty operational overview without synthetic fallback", () => {
    const now = new Date("2026-09-25T17:10:00.000Z");
    const queue: ActionQueueResult = {
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

    render(<AdminOverviewView dashboard={dashboard} queue={queue} role="OWNER" />);

    expect(screen.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: /Jumlah brief/ })).toBeInTheDocument();
    expect(screen.getByText("Antrean pekerjaan sedang kosong.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Pekerjaan terbuka/ })).toHaveAttribute("href", "/admin/queue");
    expect(screen.queryByText(/DEMO-/)).not.toBeInTheDocument();
  });
});
