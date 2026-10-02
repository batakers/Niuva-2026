import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CustomerGoogleLink } from "@/components/niuva/customer-google-link";

const href = "/api/auth/google/start?returnTo=%2Fcheckout";
const prevented: boolean[] = [];
function stopJsdomNavigation(event: Event) {
  prevented.push(event.defaultPrevented);
  event.preventDefault();
}

beforeEach(() => {
  prevented.length = 0;
  // React's container listener runs first; observe its prevention before stopping
  // jsdom's unsupported full-document navigation at the document boundary.
  document.addEventListener("click", stopJsdomNavigation);
});
afterEach(() => document.removeEventListener("click", stopJsdomNavigation));

describe("Customer Google navigation", () => {
  it("keeps a native href, announces pending, and prevents a second activation", () => {
    render(<CustomerGoogleLink available fontClassName="google-font" href={href} />);
    const link = screen.getByRole("link", { name: "Lanjutkan dengan Google" });
    expect(link).toHaveAttribute("href", href);
    expect(link).not.toHaveAttribute("aria-disabled");

    fireEvent.click(link);
    expect(screen.getByRole("status")).toHaveTextContent("Menghubungkan ke Google…");
    expect(link).toHaveAttribute("aria-busy", "true");
    fireEvent.click(link);
    expect(prevented).toEqual([false, true]);
  });

  it("restores navigation when the page returns from the browser cache", () => {
    render(<CustomerGoogleLink available fontClassName="google-font" href={href} />);
    const link = screen.getByRole("link", { name: "Lanjutkan dengan Google" });
    fireEvent.click(link);
    fireEvent(window, new Event("pageshow"));
    expect(link).not.toHaveAttribute("aria-disabled");
    expect(screen.getByRole("status")).not.toHaveTextContent("Menghubungkan");
    fireEvent.click(link);
    expect(prevented).toEqual([false, false]);
  });

  it.each([{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }])(
    "preserves modified native navigation without locking the current page: %o",
    (modifiers) => {
      render(<CustomerGoogleLink available fontClassName="google-font" href={href} />);
      const link = screen.getByRole("link", { name: "Lanjutkan dengan Google" });
      fireEvent.click(link, modifiers);
      expect(link).not.toHaveAttribute("aria-disabled");
      expect(screen.getByRole("status")).not.toHaveTextContent("Menghubungkan");
      expect(prevented).toEqual([false]);
    },
  );

  it("has no navigable Google action when the capability is unavailable", () => {
    render(<CustomerGoogleLink available={false} fontClassName="google-font" href={href} />);
    expect(screen.getByRole("button", { name: "Lanjutkan dengan Google" })).toBeDisabled();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
