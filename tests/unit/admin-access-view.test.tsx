import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminAccess } from "@/lib/auth/clerk";
import { AdminAccessUnavailableView } from "@/app/admin/admin-access-view";
import { appError } from "@/modules/shared/errors";

const authMocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
}));

const nextServerMocks = vi.hoisted(() => ({
  connection: vi.fn(),
}));

const queueMocks = vi.hoisted(() => ({
  list: vi.fn(),
}));

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

vi.mock("next/server", () => ({
  connection: nextServerMocks.connection,
}));

import AdminPage from "@/app/admin/page";

beforeEach(() => {
  authMocks.requireAdmin.mockReset();
  nextServerMocks.connection.mockReset();
  nextServerMocks.connection.mockResolvedValue(undefined);
  queueMocks.list.mockReset();
  queueMocks.list.mockResolvedValue({
    generatedAt: new Date("2026-09-11T08:00:00.000Z"),
    items: [],
  });
});

describe("admin access view", () => {
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

    render(await AdminPage());

    expect(nextServerMocks.connection).toHaveBeenCalledOnce();
    expect(authMocks.requireAdmin).toHaveBeenCalledOnce();
    expect(queueMocks.list).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("heading", { level: 1, name: "Action Queue" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
  });

  it("renders the safe fallback after an expected authorization failure", async () => {
    authMocks.requireAdmin.mockRejectedValue(appError("FORBIDDEN"));

    render(await AdminPage());

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

    render(await AdminPage());

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Action Queue belum dapat dimuat",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Data operasional belum dapat dimuat.",
    );
  });
});
