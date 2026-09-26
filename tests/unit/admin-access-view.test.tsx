import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminAccess } from "@/lib/auth/clerk";
import { AdminAccessUnavailableView } from "@/app/admin/admin-access-view";
import { appError } from "@/modules/shared/errors";

vi.mock("@/components/niuva/admin-session-actions", () => ({
  AdminSessionActions: () => null,
}));

const authMocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
}));

const nextServerMocks = vi.hoisted(() => ({
  connection: vi.fn(),
}));

const queueMocks = vi.hoisted(() => ({
  list: vi.fn(),
}));
const dashboardMocks = vi.hoisted(() => ({ load: vi.fn() }));

vi.mock("@/lib/auth/clerk", () => ({
  requireAdmin: authMocks.requireAdmin,
}));

vi.mock("@/modules/admin/action-queue-service", () => ({
  ActionQueueService: vi.fn(function MockActionQueueService() {
    return {
      list: queueMocks.list,
    };
  }),
}));

vi.mock("@/modules/admin/dashboard-service", () => ({
  DashboardService: vi.fn(function MockDashboardService() {
    return { load: dashboardMocks.load };
  }),
}));

vi.mock("next/server", () => ({
  connection: nextServerMocks.connection,
}));

import AdminPage from "@/app/admin/page";
import AdminQueuePage from "@/app/admin/queue/page";
import { AdminShell } from "@/components/niuva/admin-shell";

beforeEach(() => {
  authMocks.requireAdmin.mockReset();
  nextServerMocks.connection.mockReset();
  nextServerMocks.connection.mockResolvedValue(undefined);
  queueMocks.list.mockReset();
  queueMocks.list.mockResolvedValue({
    filteredTotal: 0,
    generatedAt: new Date("2026-09-11T08:00:00.000Z"),
    group: "all",
    items: [],
    priorityItems: [],
    totalOpen: 0,
  });
  dashboardMocks.load.mockReset();
  dashboardMocks.load.mockResolvedValue({
    generatedAt: new Date("2026-09-11T08:00:00.000Z"),
    newInquiries: 0,
    submittedCustomPrint: 0,
    paidOrders: 0,
    activity: [],
  });
});

describe("admin access view", () => {
  it("marks global Admin visual acceptance approved while exposing the approved foundation", () => {
    render(
      <AdminShell active="queue" role="OWNER">
        <main>Admin content</main>
      </AdminShell>,
    );

    const shell = document.querySelector("[data-foundation-scope='admin']");
    expect(shell).toHaveAttribute("data-foundation-propagation", "approved");
    expect(shell).toHaveAttribute("data-typography-propagation", "approved");
    expect(shell).toHaveAttribute("data-product-screen-proof-status", "approved-owner");
    expect(screen.getByText("Admin content")).toBeInTheDocument();
  });

  it("renders no protected role or preview content when access is unavailable", () => {
    render(<AdminAccessUnavailableView />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Akses admin belum tersedia" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Owner")).not.toBeInTheDocument();
    expect(screen.queryByText("Development-only preview")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("admin access route", () => {
  it("uses the server authorization boundary before rendering role context", async () => {
    authMocks.requireAdmin.mockResolvedValue({
      clerkUserId: "user_owner",
      profile: {
        clerkUserId: "user_owner",
        id: "a6f443d8-3e8a-49b5-81d0-94d56e06c208",
        isActive: true,
        role: "OWNER",
      },
    } satisfies AdminAccess);

    render(await AdminPage({ searchParams: Promise.resolve({}) }));

    expect(nextServerMocks.connection).toHaveBeenCalledOnce();
    expect(authMocks.requireAdmin).toHaveBeenCalledOnce();
    expect(queueMocks.list).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("heading", { level: 1, name: "Overview" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("renders the safe fallback after an expected authorization failure", async () => {
    authMocks.requireAdmin.mockRejectedValue(appError("FORBIDDEN"));

    render(await AdminPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Akses admin belum tersedia" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Owner")).not.toBeInTheDocument();
    expect(queueMocks.list).not.toHaveBeenCalled();
  });

  it("renders a safe queue error after authorization succeeds but the read fails", async () => {
    authMocks.requireAdmin.mockResolvedValue({
      clerkUserId: "user_admin",
      profile: {
        clerkUserId: "user_admin",
        id: "a6f443d8-3e8a-49b5-81d0-94d56e06c208",
        isActive: true,
        role: "ADMIN",
      },
    } satisfies AdminAccess);
    queueMocks.list.mockRejectedValue(new Error("database unavailable"));

    render(await AdminPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Overview belum dapat dimuat",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Tidak ada perubahan operasional yang dibuat.",
    );
  });

  it("keeps the new queue route closed without an active Admin profile", async () => {
    authMocks.requireAdmin.mockRejectedValue(appError("FORBIDDEN"));
    render(await AdminQueuePage({ searchParams: Promise.resolve({ group: "orders" }) }));
    expect(screen.getByRole("heading", { level: 1, name: "Akses admin belum tersedia" })).toBeInTheDocument();
    expect(queueMocks.list).not.toHaveBeenCalled();
  });

  it("shows a safe overview error when dashboard data fails after authorization", async () => {
    authMocks.requireAdmin.mockResolvedValue({
      clerkUserId: "user_admin",
      profile: { clerkUserId: "user_admin", id: "a6f443d8-3e8a-49b5-81d0-94d56e06c208", isActive: true, role: "ADMIN" },
    } satisfies AdminAccess);
    dashboardMocks.load.mockRejectedValue(new Error("private database failure"));
    render(await AdminPage({ searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1, name: "Overview belum dapat dimuat" })).toBeInTheDocument();
    expect(screen.queryByText("private database failure")).not.toBeInTheDocument();
  });
});
