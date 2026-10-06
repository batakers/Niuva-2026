import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_ACCESS_STATES } from "@/app/admin/admin-page-access";

const mocks = vi.hoisted(() => ({ connection: vi.fn(), loadAccess: vi.fn() }));
vi.mock("next/server", () => ({ connection: mocks.connection }));
vi.mock("@/app/admin/admin-page-access", async importOriginal => ({
  ...await importOriginal<typeof import("@/app/admin/admin-page-access")>(),
  loadAdminPageAccess: mocks.loadAccess,
}));
vi.mock("@/app/admin/admin-access-view", () => ({ AdminAccessView: ({ state }: { state: string }) => <div data-testid="access-denied">{state}</div> }));
vi.mock("@/components/niuva/admin-security-form", () => ({ AdminSecurityForm: () => <div data-testid="security-controls" /> }));

import AdminSecurityPage from "@/app/admin/security/page";

beforeEach(() => { mocks.connection.mockResolvedValue(undefined); });
describe("Admin account security page", () => {
  it.each(ADMIN_ACCESS_STATES)("shows the access state %s without account controls", async state => {
    mocks.loadAccess.mockResolvedValue({ kind: "denied", state });
    render(await AdminSecurityPage());
    expect(screen.getByTestId("access-denied")).toHaveTextContent(state);
    expect(screen.queryByTestId("security-controls")).not.toBeInTheDocument();
  });
  it("renders account controls only after verified Admin access", async () => {
    mocks.loadAccess.mockResolvedValue({ kind: "granted", access: { profile: { role: "ADMIN" } } });
    render(await AdminSecurityPage());
    expect(screen.getByRole("heading", { name: "Keamanan akun Admin" })).toBeVisible();
    expect(screen.getByTestId("security-controls")).toBeInTheDocument();
  });
});
