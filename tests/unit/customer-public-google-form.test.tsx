import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CustomerGoogleConsentForm } from "@/components/niuva/customer-google-consent-form";

const legal = { terms: { href: "/auth-test-policy?document=terms", version: "NIUVA-TERMS-v1.0" }, privacy: { href: "/auth-test-policy?document=privacy", version: "NIUVA-PRIVACY-v1.0" } };
afterEach(() => vi.unstubAllGlobals());
describe("public Google consent form", () => {
  it("retains native POST and requires independent policy and age decisions", () => {
    const { container } = render(<CustomerGoogleConsentForm returnTo="/checkout" legal={legal} />);
    const form = container.querySelector("form")!;
    expect(form).toHaveAttribute("action", "/api/auth/google/consent");
    expect(form).toHaveAttribute("method", "post");
    const choices = screen.getAllByRole("checkbox");
    expect(choices).toHaveLength(2);
    for (const choice of choices) { expect(choice).toBeRequired(); expect(choice).not.toBeChecked(); }
    expect(container.querySelector('[name="termsVersion"]')).toHaveValue("NIUVA-TERMS-v1.0");
    expect(container.querySelector('[name="privacyVersion"]')).toHaveValue("NIUVA-PRIVACY-v1.0");
    expect(screen.getByRole("link", { name: "Syarat Layanan" })).toHaveAttribute("href", legal.terms.href);
    expect(screen.getByRole("link", { name: "Kebijakan Privasi" })).toHaveAttribute("href", legal.privacy.href);
  });
  it("keeps choices and restores submit after a server rejection or page restoration", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: "Policy berubah. Muat ulang halaman." }) });
    vi.stubGlobal("fetch", fetch);
    const { container } = render(<CustomerGoogleConsentForm returnTo="/checkout" legal={legal} />);
    for (const choice of screen.getAllByRole("checkbox")) fireEvent.click(choice);
    fireEvent.submit(container.querySelector("form")!);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Policy berubah. Muat ulang halaman."));
    for (const choice of screen.getAllByRole("checkbox")) expect(choice).toBeChecked();
    expect(screen.getByRole("button", { name: "Setuju dan lanjutkan ke Google" })).toBeEnabled();
    fetch.mockReturnValue(new Promise(() => {}));
    fireEvent.submit(container.querySelector("form")!);
    expect(screen.getByRole("button")).toBeDisabled();
    fireEvent(window, new Event("pageshow"));
    expect(screen.getByRole("button", { name: "Setuju dan lanjutkan ke Google" })).toBeEnabled();
  });
});
