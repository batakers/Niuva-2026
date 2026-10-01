import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const auth = vi.hoisted(() => ({ available: true, signedIn: false, registration: true, google: true }));
vi.mock("next/server", () => ({ connection: async () => undefined }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error(`REDIRECT:${url}`); } }));
vi.mock("@/lib/auth/customer", () => ({ isCustomerSessionStoreAvailable: () => auth.available, getCurrentCustomer: async () => auth.signedIn ? { id: "test-customer" } : null }));
vi.mock("@/lib/env/server", () => ({ isLocalDemoMode: () => false }));
vi.mock("@/modules/customer-auth/email-capabilities", () => ({ customerEmailCapabilities: () => ({ password: auth.available, delivery: auth.registration, registration: auth.registration, google: auth.google }) }));
vi.mock("@/modules/customer-auth/legal", () => ({ getCustomerAuthLegalDocuments: () => auth.registration ? { terms: { href: "/test-terms", version: "TEST" }, privacy: { href: "/test-privacy", version: "TEST" } } : null }));
vi.mock("@/modules/customer-auth/email-repository", () => ({ CustomerEmailRepository: class { findToken = async () => null; } }));
import { CustomerAuthPage } from "@/components/niuva/customer-auth-page";
beforeEach(() => { Object.assign(auth, { available: true, signedIn: false, registration: true, google: true }); });
describe("Customer auth page", () => {
  it.each(["login", "register"] as const)("renders %s with email form, one-column composition and Google", async mode => {
    const { container } = render(await CustomerAuthPage({ mode, searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(mode === "login" ? "Selamat datang kembali" : "Buat akun Niuva");
    expect(screen.getByRole("textbox", { name: "Email" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kembali ke situs" })).toHaveAttribute("href", "/");
    expect(container.querySelector("aside")).toBeNull();
    expect(screen.getByRole("link", { name: "Lanjutkan dengan Google" })).toHaveAttribute("href", "/api/auth/google/start?returnTo=%2Faccount");
    expect(screen.getByRole("link", { name: mode === "login" ? "Daftar" : "Masuk" })).toHaveAttribute("href", `${mode === "login" ? "/register" : "/login"}?returnTo=%2Faccount`);
  });
  it.each([
    ["/checkout?preview=examples#summary", "Masuk atau buat akun untuk melanjutkan checkout Anda."],
    ["/custom-print/request?type=model", "Masuk atau buat akun untuk melanjutkan permintaan Custom Print Anda."],
    ["/project-brief", "Masuk atau buat akun untuk melanjutkan Project Brief Anda."],
  ])("keeps destination context %s", async (returnTo, description) => {
    render(await CustomerAuthPage({ mode: "login", searchParams: Promise.resolve({ returnTo }) }));
    expect(screen.getByText(description)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Daftar" })).toHaveAttribute("href", `/register?returnTo=${encodeURIComponent(returnTo)}`);
  });
  it("rejects unsafe destinations", async () => {
    render(await CustomerAuthPage({ mode: "login", searchParams: Promise.resolve({ returnTo: "https://evil.example" }) }));
    expect(screen.getByRole("link", { name: "Lanjutkan dengan Google" })).toHaveAttribute("href", "/api/auth/google/start?returnTo=%2Faccount");
  });
  it("gates new registration without legal documents but preserves password login", async () => {
    auth.registration = false;
    render(await CustomerAuthPage({ mode: "register", searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("button", { name: "Buat akun" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Lanjutkan dengan Google" })).toBeDisabled();
    expect(screen.getByText("Pendaftaran baru belum tersedia.")).toBeInTheDocument();
  });
  it("password login does not require Google capability", async () => {
    auth.google = false;
    render(await CustomerAuthPage({ mode: "login", searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("button", { name: "Masuk" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Lanjutkan dengan Google" })).toBeDisabled();
  });
  it.each(["auth_failed", "rate_limited", "unavailable", "conflict"])("shows recovery for %s", async error => {
    render(await CustomerAuthPage({ mode: "login", searchParams: Promise.resolve({ error }) }));
    expect(screen.getByText("Permintaan belum selesai.")).toBeInTheDocument();
  });
  it("confirms logout", async () => {
    render(await CustomerAuthPage({ mode: "login", searchParams: Promise.resolve({ loggedOut: "1" }) }));
    expect(screen.getByText("Anda sudah keluar.")).toBeInTheDocument();
  });
  it("redirects authenticated Customers safely", async () => {
    auth.signedIn = true;
    await expect(CustomerAuthPage({ mode: "register", searchParams: Promise.resolve({ returnTo: "/checkout" }) })).rejects.toThrow("REDIRECT:/checkout");
    await expect(CustomerAuthPage({ mode: "login", searchParams: Promise.resolve({ returnTo: "//evil.example" }) })).rejects.toThrow("REDIRECT:/account");
  });
  it("never claims email delivery on a direct verification visit", async () => {
    render(await CustomerAuthPage({ mode: "verify-email", searchParams: Promise.resolve({}) }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Periksa email Anda");
    expect(screen.queryByText("Email verifikasi dikirim ke")).toBeNull();
    expect(screen.getByText("Verifikasi email diperlukan.")).toBeInTheDocument();
  });
});
