import { render, screen, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CustomerEmailForm } from "@/components/niuva/customer-email-form";
const legal = { terms: { href: "/test-terms", version: "TEST" }, privacy: { href: "/test-privacy", version: "TEST" } };
beforeEach(() => { vi.restoreAllMocks(); });
describe("Customer email form", () => {
  it("requires a separate unchecked age declaration and focuses it before sending", () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<CustomerEmailForm mode="register" returnTo="/account" legal={legal} />);
    const age = screen.getByRole("checkbox", { name: "Saya menyatakan bahwa saya berusia 18 tahun atau lebih." });
    expect(age).not.toBeChecked(); expect(age).toBeRequired();
    fireEvent.change(screen.getByLabelText("Nama lengkap"), { target: { value: "Adult Fixture" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "adult@example.test" } });
    fireEvent.change(screen.getByLabelText("Password", { exact: true }), { target: { value: "adult long passphrase" } });
    fireEvent.change(screen.getByLabelText("Konfirmasi password"), { target: { value: "adult long passphrase" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Saya menyetujui/ }));
    fireEvent.submit(container.querySelector("form")!);
    expect(age).toHaveFocus(); expect(age).toHaveAttribute("aria-describedby", "auth-ageDeclaration-error");
    expect(fetchMock).not.toHaveBeenCalled(); vi.unstubAllGlobals();
  });
  it("validates on blur and connects the message to its input", () => {
    render(<CustomerEmailForm mode="login" returnTo="/account" />);
    const email = screen.getByLabelText("Email");
    expect(email).toHaveAttribute("aria-invalid", "false");
    fireEvent.blur(email, { target: { value: "invalid" } });
    expect(email).toHaveAttribute("aria-invalid", "true");
    expect(email).toHaveAttribute("aria-describedby", "auth-email-error");
    fireEvent.change(email, { target: { value: "valid@example.test" } });
    expect(email).toHaveAttribute("aria-invalid", "false");
  });
  it("focuses first invalid field and never submits invalid data", () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<CustomerEmailForm mode="register" returnTo="/checkout" legal={legal} />);
    fireEvent.submit(container.querySelector("form")!);
    expect(screen.getByLabelText("Nama lengkap")).toHaveFocus();
    expect(fetchMock).not.toHaveBeenCalled(); vi.unstubAllGlobals();
  });
  it("toggles password visibility with an accessible name", () => {
    render(<CustomerEmailForm mode="login" returnTo="/account" />);
    const password = screen.getByLabelText("Password", { exact: true });
    expect(password).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Tampilkan password" }));
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "Sembunyikan password" })).toHaveAttribute("aria-pressed", "true");
  });
  it("gates register when policies are absent and uses a native POST form", () => {
    const { container } = render(<CustomerEmailForm mode="register" returnTo="/account" available={false} />);
    expect(screen.getByRole("button", { name: "Buat akun" })).toBeDisabled();
    expect(container.querySelector("form")).toHaveAttribute("method", "post");
    expect(container.querySelector("form")).toHaveAttribute("action", "/api/auth/email/register");
  });
});
