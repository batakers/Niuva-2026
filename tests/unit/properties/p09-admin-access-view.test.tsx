// Feature: system-pages-and-error-states, Property 9
// Property 9: Per-state content and controls of AdminAccessView.
// Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ADMIN_ACCESS_STATES, type AdminAccessState } from "@/app/admin/admin-page-access";
import { AdminAccessView } from "@/app/admin/admin-access-view";

vi.mock("@clerk/nextjs", () => ({
  useClerk: () => ({ signOut: vi.fn() }),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const SIGN_OUT_NAME = "Keluar";
const RELOAD_NAME = "Muat ulang";

type Expected = Readonly<{ signInLinks: number; signOutButtons: number; reloadButtons: number }>;

const EXPECTED: Readonly<Record<AdminAccessState, Expected>> = {
  UNAUTHENTICATED: { signInLinks: 1, signOutButtons: 0, reloadButtons: 0 },
  FORBIDDEN: { signInLinks: 0, signOutButtons: 1, reloadButtons: 0 },
  AUTH_UNAVAILABLE: { signInLinks: 0, signOutButtons: 0, reloadButtons: 1 },
};

const linksTo = (href: string) =>
  screen.queryAllByRole("link").filter((link) => link.getAttribute("href") === href);

const buttonsNamed = (name: string) =>
  screen.queryAllByRole("button").filter((button) => button.textContent?.trim() === name);

afterEach(cleanup);

describe("Property 9: AdminAccessView per-state content and controls", () => {
  it("covers exactly the three admin access states", () => {
    expect([...ADMIN_ACCESS_STATES].sort()).toEqual(Object.keys(EXPECTED).sort());
  });

  it.each(ADMIN_ACCESS_STATES)("%s renders its own title, description and only its own controls", (state) => {
    render(<AdminAccessView state={state} />);

    const heading = screen.getByRole("heading", { level: 1 });
    const title = heading.textContent?.trim() ?? "";
    const description = heading.nextElementSibling?.textContent?.trim() ?? "";
    expect(title).not.toBe("");
    expect(description).not.toBe("");

    // Exactly one link to the public home, and the state's own control only.
    expect(linksTo("/")).toHaveLength(1);
    expect(linksTo("/admin/sign-in")).toHaveLength(EXPECTED[state].signInLinks);
    expect(buttonsNamed(SIGN_OUT_NAME)).toHaveLength(EXPECTED[state].signOutButtons);
    expect(buttonsNamed(RELOAD_NAME)).toHaveLength(EXPECTED[state].reloadButtons);

    // No other interactive control is present.
    const expectedButtons = EXPECTED[state].signOutButtons + EXPECTED[state].reloadButtons;
    expect(screen.queryAllByRole("button")).toHaveLength(expectedButtons);
    const pageLinks = screen.queryAllByRole("link").filter((link) => !link.getAttribute("href")?.startsWith("#"));
    expect(pageLinks).toHaveLength(1 + EXPECTED[state].signInLinks);
  });

  it("gives every state a distinct, non-empty Indonesian title and description", () => {
    const seen = ADMIN_ACCESS_STATES.map((state) => {
      const { unmount } = render(<AdminAccessView state={state} />);
      const heading = screen.getByRole("heading", { level: 1 });
      const copy = {
        title: heading.textContent?.trim() ?? "",
        description: heading.nextElementSibling?.textContent?.trim() ?? "",
      };
      unmount();
      return copy;
    });

    for (const { title, description } of seen) {
      expect(title.length).toBeGreaterThan(0);
      expect(description.length).toBeGreaterThan(0);
      // Indonesian marker words present in every admin access description.
      expect(description).toMatch(/\b(Anda|akun|Akses|halaman|yang)\b/i);
    }
    expect(new Set(seen.map((copy) => copy.title)).size).toBe(ADMIN_ACCESS_STATES.length);
    expect(new Set(seen.map((copy) => copy.description)).size).toBe(ADMIN_ACCESS_STATES.length);
  });
});
