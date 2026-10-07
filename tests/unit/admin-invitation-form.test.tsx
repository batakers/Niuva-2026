import { StrictMode } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminInvitationForm } from "@/app/admin/admins/new/invitation-form";
import { AdminAuthForm } from "@/components/niuva/admin-auth-form";
const mocks = vi.hoisted(() => ({ action: vi.fn() }));
vi.mock("@/app/admin/admins/new/actions", () => ({ inviteAdminAction: mocks.action }));
beforeEach(() => { mocks.action.mockReset(); window.history.replaceState(null, "", "/"); });
afterEach(() => { vi.unstubAllGlobals(); window.history.replaceState(null, "", "/"); });

describe("Admin invitation form states", () => {
  it("keeps sending unavailable until mail is configured", () => {
    render(<AdminInvitationForm mailReady={false} />);
    expect(screen.getByLabelText(/Nama Admin/)).toBeDisabled();
    expect(screen.getByRole("button", { name: "Kirim undangan" })).toBeDisabled();
  });
  it("shows successful delivery and resets the form for another Admin", async () => {
    mocks.action.mockResolvedValue({ status: "success", email: "fixture@example.test" });
    render(<AdminInvitationForm mailReady />);
    fireEvent.change(screen.getByLabelText(/Nama Admin/), { target: { value: "Synthetic Admin" } });
    fireEvent.change(screen.getByLabelText(/Email Admin/), { target: { value: "fixture@example.test" } });
    fireEvent.submit(screen.getByRole("button", { name: "Kirim undangan" }).closest("form")!);
    expect(await screen.findByRole("status")).toHaveTextContent("fixture@example.test");
    fireEvent.click(screen.getByRole("button", { name: "Tambah Admin lain" }));
    expect(screen.getByLabelText(/Nama Admin/)).toHaveValue("");
  });
  it("preserves an invitation fragment across Strict Mode effects and clears it from history", async () => {
    const token = "a".repeat(43);
    window.history.replaceState(null, "", `/admin/sign-in?flow=invite#token=${token}`);
    const fetch = vi.fn().mockResolvedValue(Response.json({ success: true }));
    vi.stubGlobal("fetch", fetch);
    render(<StrictMode><AdminAuthForm invitation /></StrictMode>);
    await waitFor(() => expect(screen.getByRole("button", { name: "Aktifkan akun" })).toBeEnabled());
    expect(window.location.hash).toBe("");
    expect(screen.getByLabelText("Password baru", { exact: true })).toHaveAttribute("minlength", "8");
    expect(screen.getByLabelText("Password baru", { exact: true })).toHaveAttribute("maxlength", "15");
    fireEvent.change(screen.getByLabelText("Password baru", { exact: true }), { target: { value: "Test-only-182!" } });
    fireEvent.change(screen.getByLabelText("Konfirmasi password baru", { exact: true }), { target: { value: "Test-only-182!" } });
    fireEvent.click(screen.getByRole("button", { name: "Aktifkan akun" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Akun Admin sudah aktif");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ token, password: "Test-only-182!" });
  });
});
