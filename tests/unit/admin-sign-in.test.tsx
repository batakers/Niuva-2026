import { render, screen, fireEvent } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AdminSignInPage from "@/app/admin/sign-in/[[...sign-in]]/page";
const fetchMock = vi.fn();
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
beforeEach(() => {
  vi.stubEnv("BETTER_AUTH_SECRET", "test-only-admin-auth-secret-at-least-32-characters");
  vi.stubEnv("BETTER_AUTH_URL", "http://localhost:3000");
  vi.stubEnv("DATABASE_URL", "postgresql://localhost/niuva_test");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  fetchMock.mockImplementation(async () => Response.json({ stage: "sign-in" }));
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("native Admin sign-in", () => {
  it("provides email/password and no public Admin registration", async () => {
    render(await AdminSignInPage());
    expect(await screen.findByLabelText("Email Admin")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.queryByRole("link", { name: /daftar|register|signup/i })).not.toBeInTheDocument();
  });
  it("fails visibly when auth configuration is incomplete", async () => {
    vi.stubEnv("BETTER_AUTH_SECRET", "");
    render(await AdminSignInPage());
    expect(screen.getByRole("alert")).toHaveTextContent("Login Admin belum tersedia");
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
  });
  it("requires an authenticator challenge after password login", async () => {
    render(await AdminSignInPage());
    await screen.findByLabelText("Email Admin");
    fetchMock.mockResolvedValueOnce(Response.json({ twoFactorRedirect: true }));
    fireEvent.change(screen.getByLabelText("Email Admin"), { target: { value: "admin@example.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Test-only-password-29!" } });
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(await screen.findByLabelText("Kode authenticator")).toBeInTheDocument();
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Gunakan kode pemulihan" }));
    expect(screen.getByLabelText("Kode pemulihan")).toBeInTheDocument();
  });
  it("does not show a login success on a rejected password", async () => {
    render(await AdminSignInPage());
    await screen.findByLabelText("Email Admin");
    fetchMock.mockResolvedValueOnce(Response.json({ code: "INVALID_EMAIL_OR_PASSWORD" }, { status: 401 }));
    fireEvent.change(screen.getByLabelText("Email Admin"), { target: { value: "admin@example.test" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "Incorrect-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Masuk" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Permintaan gagal");
    expect(screen.queryByLabelText("Kode authenticator")).not.toBeInTheDocument();
  });
});
