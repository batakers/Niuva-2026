import { cleanup, render, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/lib/env/server", () => ({ isLocalDemoMode: () => false }));

import RootNotFound, { metadata } from "@/app/not-found";
import { SYSTEM_HEADING_ID, systemCopy } from "@/components/niuva/system-state-copy";

const injected = {
  token: "tok_SECRET-1234567890abcdef",
  slug: "produk-rahasia-slug",
  query: "token=qry_SECRET-9876&redirect=/admin",
} as const;

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

function renderNotFound() {
  // Simulate a token URL in the address bar and pass hostile props. The
  // component must ignore both, since it takes no props and reads no path.
  window.history.replaceState(null, "", `/orders/${injected.token}/${injected.slug}?${injected.query}`);
  const Component = RootNotFound as unknown as ComponentType<Record<string, unknown>>;
  return render(
    <Component
      params={Promise.resolve({ token: injected.token, slug: injected.slug })}
      searchParams={Promise.resolve({ token: injected.token })}
    />,
  );
}

describe("Root not-found page", () => {
  it("renders exactly one h1 and one main#main-content", () => {
    const { container } = renderNotFound();

    expect(container.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(systemCopy.notFound.title);
    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(container.querySelectorAll("#main-content")).toHaveLength(1);
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("main")).toHaveAttribute("data-system-state", "not-found");
  });

  it("renders the Indonesian description paragraph", () => {
    renderNotFound();

    const main = screen.getByRole("main");
    const paragraph = within(main).getByText(systemCopy.notFound.description);
    expect(paragraph.tagName).toBe("P");
    expect(paragraph.textContent).toMatch(/tidak tersedia/i);
    expect(main.textContent).not.toMatch(/\b(not found|404|page|error|oops)\b/i);
  });

  it("renders two recovery links with non-empty text and min-h-11", () => {
    renderNotFound();

    const main = screen.getByRole("main");
    const links = within(main).getAllByRole("link");
    expect(links).toHaveLength(2);
    for (const link of links) {
      expect(link.textContent?.trim()).toBeTruthy();
      expect(link.className).toContain("min-h-11");
    }
    expect(links[0]).toHaveTextContent(systemCopy.actions.home);
    expect(links[0]).toHaveAttribute("href", "/");
    expect(links[1]).toHaveTextContent(systemCopy.actions.shop);
    expect(links[1]).toHaveAttribute("href", "/shop");
  });

  it("exports noindex, nofollow robots metadata", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(typeof metadata.title).toBe("string");
  });

  it("keeps DOM order h1 → p → actions and focuses the heading via SystemFocusTarget", () => {
    renderNotFound();

    const main = screen.getByRole("main");
    const heading = within(main).getByRole("heading", { level: 1 });
    const paragraph = within(main).getByText(systemCopy.notFound.description);
    const links = within(main).getAllByRole("link");
    const actions = links[0].parentElement as HTMLElement;

    expect(heading).toHaveAttribute("id", SYSTEM_HEADING_ID);
    expect(actions).toBe(links[1].parentElement);
    expect(heading.compareDocumentPosition(paragraph) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(paragraph.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(Array.from(main.children).filter((el) => ["H1", "P", "DIV"].includes(el.tagName))).toEqual([
      heading,
      paragraph,
      actions,
    ]);

    // SystemFocusTarget renders no DOM, so its presence shows as focus on the h1.
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(document.activeElement).toBe(heading);
  });

  it("leaks no token, slug or query value into text, attributes or metadata", () => {
    const { container } = renderNotFound();

    const html = container.innerHTML;
    const text = container.textContent ?? "";
    const serializedMetadata = JSON.stringify(metadata);
    for (const value of [injected.token, injected.slug, injected.query, "qry_SECRET", "SECRET"]) {
      expect(html).not.toContain(value);
      expect(text).not.toContain(value);
      expect(serializedMetadata).not.toContain(value);
    }
    for (const element of container.querySelectorAll("*")) {
      for (const attribute of Array.from(element.attributes)) {
        expect(attribute.value).not.toMatch(/SECRET|produk-rahasia|\/orders\/|\/quote\//);
      }
    }
    expect(document.title).not.toContain(injected.token);
  });

  it("renders identical markup regardless of injected values", () => {
    const first = renderNotFound().container.innerHTML;
    cleanup();
    window.history.replaceState(null, "", "/");
    const Component = RootNotFound as unknown as ComponentType;
    const second = render(<Component />).container.innerHTML;

    expect(second).toBe(first);
  });
});
