import { cleanup, render, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/orders/x" }));

import AdminNotFound, { metadata } from "@/app/admin/not-found";
import { SYSTEM_HEADING_ID, systemCopy } from "@/components/niuva/system-state-copy";

const injected = {
  id: "ord_SECRET-1234567890abcdef",
  error: "PrismaClientKnownRequestError: P2025 SECRET stack at db.ts:42",
} as const;

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

function renderNotFound() {
  // The component takes no props and reads no path, so hostile params and a
  // record id in the address bar must not reach the output.
  window.history.replaceState(null, "", `/admin/orders/${injected.id}`);
  const Component = AdminNotFound as unknown as ComponentType<Record<string, unknown>>;
  return render(
    <Component
      params={Promise.resolve({ id: injected.id })}
      error={new Error(injected.error)}
      message={injected.error}
    />,
  );
}

describe("Admin not-found page", () => {
  it("renders exactly one h1 and one main#main-content", () => {
    const { container } = renderNotFound();

    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(systemCopy.adminNotFound.title);
    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(container.querySelectorAll("#main-content")).toHaveLength(1);
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("main")).toHaveAttribute("data-system-state", "admin-not-found");
  });

  it("renders the main message and a /admin recovery link with min-h-11", () => {
    renderNotFound();

    const main = screen.getByRole("main");
    const paragraph = within(main).getByText(systemCopy.adminNotFound.description);
    expect(paragraph.tagName).toBe("P");

    const links = within(main).getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveTextContent(systemCopy.actions.adminHome);
    expect(links[0]).toHaveAttribute("href", "/admin");
    expect(links[0].className).toContain("min-h-11");
  });

  it("exports noindex, nofollow robots metadata", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(typeof metadata.title).toBe("string");
  });

  it("focuses the heading via SystemFocusTarget", () => {
    renderNotFound();

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveAttribute("id", SYSTEM_HEADING_ID);
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(document.activeElement).toBe(heading);
  });

  it("leaks no id or raw error text into text, attributes or metadata", () => {
    const { container } = renderNotFound();

    const html = container.innerHTML;
    const text = container.textContent ?? "";
    const serializedMetadata = JSON.stringify(metadata);
    for (const value of [injected.id, injected.error, "SECRET", "Prisma", "P2025"]) {
      expect(html).not.toContain(value);
      expect(text).not.toContain(value);
      expect(serializedMetadata).not.toContain(value);
    }
    for (const element of container.querySelectorAll("*")) {
      for (const attribute of Array.from(element.attributes)) {
        expect(attribute.value).not.toMatch(/SECRET|ord_|\/admin\/orders\//);
      }
    }
    expect(document.title).not.toContain(injected.id);
  });

  it("renders identical markup regardless of injected values", () => {
    const first = renderNotFound().container.innerHTML;
    cleanup();
    window.history.replaceState(null, "", "/");
    const Component = AdminNotFound as unknown as ComponentType;
    const second = render(<Component />).container.innerHTML;

    expect(second).toBe(first);
  });
});
