import { render, screen, cleanup } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { AdminOverviewView } from "@/app/admin/overview-view";
import { projectActionQueueSignals } from "@/modules/admin/action-queue";
import type { AdminOverviewData } from "@/modules/admin/overview-types";
import { projectTraffic } from "@/modules/analytics/service";
import { reportWindow } from "@/modules/analytics/contract";
vi.mock("@/components/niuva/admin-session-actions", () => ({ AdminSessionActions: () => null }));
const now = new Date("2026-10-08T01:00:00Z");
const data: AdminOverviewData = { range: "30d", generatedAt: now.toISOString(), attention: { status: "ok", data: projectActionQueueSignals([], now) }, finance: { status: "ok", data: { range: "30d", grossConfirmedReceiptsRp: "0", validExpensesRp: "0", needsReviewCount: 0, points: [] } }, paidOrders: { status: "ok", data: 0 }, activity: { status: "ok", data: { items: [], page: 1, hasNext: false } }, traffic: { status: "ok", data: { collectionEnabled: false, report: projectTraffic([], reportWindow("30d", now)) } } };
it("shows the same compact composition for both roles with direct filtered links and honest zero values", () => {
  for (const role of ["OWNER", "ADMIN"] as const) {
    render(<AdminOverviewView data={data} role={role} />);
    expect(screen.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /B2B perlu ditindaklanjuti/ })).toHaveAttribute("href", "/admin/inquiries?view=needs-action");
    expect(screen.getByRole("link", { name: /Custom Print perlu tindakan/ })).toHaveAttribute("href", "/admin/custom-print?view=needs-action");
    expect(screen.queryByRole("link", { name: /Action Queue/ })).not.toBeInTheDocument();
    expect(screen.getByText(/Pengumpulan tayangan belum aktif/)).toBeInTheDocument();
    expect(screen.getByText(/Belum ada aktivitas tercatat/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "13 bulan" })).toHaveAttribute("href", "/admin?range=13m");
    cleanup();
  }
});
it("isolates finance, activity and traffic failures without fabricating zeros", () => {
  render(<AdminOverviewView data={{ ...data, range: "13m", finance: { status: "unavailable", message: "Keuangan belum dapat dimuat." }, activity: { status: "unavailable", message: "Aktivitas belum dapat dimuat." }, traffic: { status: "unavailable", message: "Trafik belum dapat dimuat." } }} role="ADMIN" />);
  expect(screen.getByText("Keuangan belum dapat dimuat.")).toBeInTheDocument(); expect(screen.getByText("Aktivitas belum dapat dimuat.")).toBeInTheDocument(); expect(screen.getByText("Trafik belum dapat dimuat.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "13 bulan" })).toHaveAttribute("aria-current", "page");
});
