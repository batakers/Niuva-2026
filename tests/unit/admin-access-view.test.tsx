import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminAccess } from "@/lib/auth/admin";
import type { AdminAccessState } from "@/app/admin/admin-page-access";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { systemCopy } from "@/components/niuva/system-state-copy";
import { appError } from "@/modules/shared/errors";

vi.mock("@/components/niuva/admin-session-actions", () => ({
  AdminSessionActions: () => null,
}));

const fetchMock = vi.hoisted(() => vi.fn());
const routerMocks = vi.hoisted(() => ({ refresh: vi.fn(), replace: vi.fn() }));
const navigationMocks = vi.hoisted(() => ({ navigate: vi.fn() }));
vi.mock("@/components/niuva/admin-auth-navigation", () => ({ navigateAfterAdminAuth: navigationMocks.navigate }));



vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useRouter: () => routerMocks };
});

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

vi.mock("@/lib/auth/admin", () => ({
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

vi.mock("@/modules/admin/reports/service", () => ({ AdminReportsService: vi.fn(function Reports() { return { load: async () => { await dashboardMocks.load(); return { generatedAt: "2026-10-08T00:00:00Z", finance: { status: "unavailable", message: "Keuangan belum dapat dimuat." }, operations: { status: "unavailable", message: "Operasional belum dapat dimuat." }, traffic: { status: "unavailable", message: "Trafik belum dapat dimuat." } }; } }; }) }));
vi.mock("@/modules/admin/activity-timeline", () => ({ AdminActivityTimelineService: vi.fn(function Activity() { return { list: async () => ({ items: [], page: 1, hasNext: false }) }; }) }));
vi.mock("next/server", () => ({
  connection: nextServerMocks.connection,
}));

import AdminPage from "@/app/admin/page";
import AdminQueuePage from "@/app/admin/queue/page";
import { AdminShell } from "@/components/niuva/admin-shell";

beforeEach(() => {
  fetchMock.mockReset().mockImplementation(async () => Response.json({ success: true }));
  vi.stubGlobal("fetch", fetchMock);
  routerMocks.replace.mockReset();
  navigationMocks.navigate.mockReset();
  routerMocks.refresh.mockReset();
  authMocks.requireAdmin.mockReset();
  nextServerMocks.connection.mockReset();
  nextServerMocks.connection.mockResolvedValue(undefined);
  queueMocks.list.mockReset();
  queueMocks.list.mockResolvedValue({
    summary: { groups: { inquiries: 0, "custom-print": 0, orders: 0 }, exceptions: 0 },
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

afterEach(() => vi.unstubAllGlobals());
describe("admin access view", () => {
  it("marks the redesigned Admin visual pending while exposing the approved foundation", () => {
    render(
      <AdminShell active="queue" role="OWNER">
        <main>Admin content</main>
      </AdminShell>,
    );

    const shell = document.querySelector("[data-foundation-scope='admin']");
    expect(shell).toHaveAttribute("data-foundation-propagation", "approved");
    expect(shell).toHaveAttribute("data-typography-propagation", "approved");
    expect(shell).toHaveAttribute("data-product-screen-proof-status", "pending-owner-review");
    expect(screen.getByText("Admin content")).toBeInTheDocument();
  });

  it("renders UNAUTHENTICATED with a sign-in link, one home link and no other controls", () => {
    render(<AdminAccessView state="UNAUTHENTICATED" />);

    const copy = systemCopy.adminAccess.UNAUTHENTICATED;
    expect(screen.getByRole("heading", { level: 1, name: copy.title })).toBeInTheDocument();
    expect(screen.getByText(copy.description)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: systemCopy.actions.signIn })).toHaveAttribute("href", "/admin/sign-in");
    expect(homeLinks()).toHaveLength(1);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText("Owner")).not.toBeInTheDocument();
    expect(screen.queryByText("Development-only preview")).not.toBeInTheDocument();
  });

  it("renders FORBIDDEN with only the sign-out control and one home link", () => {
    render(<AdminAccessView state="FORBIDDEN" />);

    const copy = systemCopy.adminAccess.FORBIDDEN;
    expect(screen.getByRole("heading", { level: 1, name: copy.title })).toBeInTheDocument();
    expect(screen.getByText(copy.description)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: systemCopy.actions.signOut })).toBeEnabled();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(homeLinks()).toHaveLength(1);
    expect(screen.queryByRole("link", { name: systemCopy.actions.signIn })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: systemCopy.actions.reload })).not.toBeInTheDocument();
  });

  it("renders AUTH_UNAVAILABLE with only the reload control and one home link", () => {
    render(<AdminAccessView state="AUTH_UNAVAILABLE" />);

    const copy = systemCopy.adminAccess.AUTH_UNAVAILABLE;
    expect(screen.getByRole("heading", { level: 1, name: copy.title })).toBeInTheDocument();
    expect(screen.getByText(copy.description)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: systemCopy.actions.reload })).toBeEnabled();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(homeLinks()).toHaveLength(1);
    expect(screen.queryByRole("link", { name: systemCopy.actions.signIn })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: systemCopy.actions.signOut })).not.toBeInTheDocument();
  });

  it("signs out with a redirect to the public home page", async () => {
    render(<AdminAccessView state="FORBIDDEN" />);

    fireEvent.click(screen.getByRole("button", { name: systemCopy.actions.signOut }));

    await waitFor(() => expect(navigationMocks.navigate).toHaveBeenCalledWith("/"));
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/auth/sign-out", expect.objectContaining({ method: "POST", credentials: "same-origin" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a static alert without raw detail when sign-out fails and keeps the button enabled", async () => {
    fetchMock.mockRejectedValue(new Error("clerk_secret_failure user_leak@example.test"));
    render(<AdminAccessView state="FORBIDDEN" />);

    fireEvent.click(screen.getByRole("button", { name: systemCopy.actions.signOut }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(systemCopy.signOutFailed.title);
    expect(alert).toHaveTextContent(systemCopy.signOutFailed.description);
    expect(document.body).not.toHaveTextContent("clerk_secret_failure");
    expect(document.body).not.toHaveTextContent("user_leak@example.test");
    expect(screen.getByRole("button", { name: systemCopy.actions.signOut })).toBeEnabled();
  });

  it("refreshes the route on reload and keeps the same state and an active button", async () => {
    render(<AdminAccessView state="AUTH_UNAVAILABLE" />);

    fireEvent.click(screen.getByRole("button", { name: systemCopy.actions.reload }));

    await waitFor(() => expect(routerMocks.refresh).toHaveBeenCalledOnce());
    await waitFor(() => expect(screen.getByRole("button", { name: systemCopy.actions.reload })).toBeEnabled());
    expect(
      screen.getByRole("heading", { level: 1, name: systemCopy.adminAccess.AUTH_UNAVAILABLE.title }),
    ).toBeInTheDocument();
  });

  it.each(["UNAUTHENTICATED", "FORBIDDEN", "AUTH_UNAVAILABLE"] as const)(
    "renders no email, user id, role or raw error for %s even when the error carries them",
    async (state: AdminAccessState) => {
      const errorCode = state === "UNAUTHENTICATED" ? "UNAUTHORIZED" : state;
      authMocks.requireAdmin.mockRejectedValue(
        appError(errorCode, {
          message: "raw_error_message leak@example.test user_leak_123 OWNER",
          details: { email: "leak@example.test", userId: "user_leak_123", role: "OWNER" },
        }),
      );

      render(await AdminPage({ searchParams: Promise.resolve({}) }));

      const text = document.body.textContent ?? "";
      for (const leaked of ["leak@example.test", "user_leak_123", "raw_error_message", "OWNER"]) {
        expect(text).not.toContain(leaked);
      }
      expect(
        screen.getByRole("heading", { level: 1, name: systemCopy.adminAccess[state].title }),
      ).toBeInTheDocument();
    },
  );
});

function homeLinks(): HTMLElement[] {
  return screen.getAllByRole("link").filter((link) => link.getAttribute("href") === "/");
}

describe("admin access route", () => {
  it("uses the server authorization boundary before rendering role context", async () => {
    authMocks.requireAdmin.mockResolvedValue({
      authUserId: "user_owner",
      profile: {
        authUserId: "user_owner",
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
    expect(screen.getByText("Owner", { selector: "span" })).toBeInTheDocument();
  });

  it("renders the safe fallback after an expected authorization failure", async () => {
    authMocks.requireAdmin.mockRejectedValue(appError("FORBIDDEN"));

    render(await AdminPage({ searchParams: Promise.resolve({}) }));

    expect(
      screen.getByRole("heading", { level: 1, name: systemCopy.adminAccess.FORBIDDEN.title }),
    ).toBeInTheDocument();
    expect(screen.queryByText("Owner")).not.toBeInTheDocument();
    expect(queueMocks.list).not.toHaveBeenCalled();
  });

  it("renders a safe queue error after authorization succeeds but the read fails", async () => {
    authMocks.requireAdmin.mockResolvedValue({
      authUserId: "user_admin",
      profile: {
        authUserId: "user_admin",
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
        name: "Overview",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Pekerjaan yang perlu perhatian belum dapat dimuat.")).toBeInTheDocument();
    expect(screen.queryByText("database unavailable")).not.toBeInTheDocument();
  });

  it("keeps the new queue route closed without an active Admin profile", async () => {
    authMocks.requireAdmin.mockRejectedValue(appError("FORBIDDEN"));
    render(await AdminQueuePage({ searchParams: Promise.resolve({ group: "orders" }) }));
    expect(screen.getByRole("heading", { level: 1, name: systemCopy.adminAccess.FORBIDDEN.title })).toBeInTheDocument();
    expect(queueMocks.list).not.toHaveBeenCalled();
  });

  it("rejects unexpected report composition failure without showing private details", async () => {
    authMocks.requireAdmin.mockResolvedValue({
      authUserId: "user_admin",
      profile: { authUserId: "user_admin", id: "a6f443d8-3e8a-49b5-81d0-94d56e06c208", isActive: true, role: "ADMIN" },
    } satisfies AdminAccess);
    dashboardMocks.load.mockRejectedValue(new Error("private database failure"));
    await expect(AdminPage({ searchParams: Promise.resolve({}) })).rejects.toThrow("private database failure");
    expect(screen.queryByText("private database failure")).not.toBeInTheDocument();
  });
});
