import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InternalGoogleConsentForm } from "@/components/niuva/internal-google-consent-form";
describe("internal Google consent form", () => {
  it("starts age consent unchecked and blocks JS submission with focus and an accessible message", () => {
    const fetchMock = vi.fn(); vi.stubGlobal("fetch", fetchMock);
    const { container } = render(<InternalGoogleConsentForm returnTo="/checkout" />);
    const age = screen.getByRole("checkbox", { name: "Saya menyatakan bahwa saya berusia 18 tahun atau lebih." });
    expect(age).not.toBeChecked(); expect(age).toBeRequired();
    fireEvent.click(screen.getByRole("checkbox", { name: /Saya menyetujui/ }));
    fireEvent.submit(container.querySelector("form")!);
    expect(fetchMock).not.toHaveBeenCalled(); expect(age).toHaveFocus();
    expect(age).toHaveAttribute("aria-describedby", "internal-age-error");
  });
  afterEach(() => vi.unstubAllGlobals());
  it("keeps native POST and returnTo, prevents double submit and restores pending on pageshow", () => {
    const { container } = render(<InternalGoogleConsentForm returnTo="/checkout" />);
    vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {})));
    const form = container.querySelector("form")!;
    expect(form.method).toBe("post"); expect(form.getAttribute("action")).toBe("/api/auth/internal/google-consent");
    expect(container.querySelector('input[name="returnTo"]')).toHaveValue("/checkout");
    expect(screen.getByRole("checkbox", { name: /Saya menyetujui/ })).toBeRequired();
    fireEvent.click(screen.getByRole("checkbox", { name: /Saya menyetujui/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Saya menyatakan/ })); fireEvent.submit(form);
    expect(screen.getByRole("button")).toBeDisabled(); expect(screen.getByRole("status")).toHaveTextContent("Menghubungkan ke Google…");
    const duplicate = new Event("submit", { bubbles: true, cancelable: true });
    fireEvent(form, duplicate); expect(duplicate.defaultPrevented).toBe(true);
    fireEvent(window, new Event("pageshow")); expect(screen.getByRole("button")).toBeEnabled();
  });
});
