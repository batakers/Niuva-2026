import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/lib/env/server", () => ({ isLocalDemoMode: () => false }));

import { PublicLoadingState } from "@/components/niuva/public-loading-state";

const label = "Memuat halaman";

afterEach(cleanup);

function renderLoading(scope = "shop") {
  return render(<PublicLoadingState label={label} scope={scope} />);
}

describe("PublicLoadingState", () => {
  it("renders exactly one labelled status and no h1", () => {
    const { container } = renderLoading();

    const statuses = screen.getAllByRole("status");
    expect(statuses).toHaveLength(1);
    expect(statuses[0]).toHaveAttribute("aria-label", label);
    expect(screen.getByRole("status", { name: label })).toBeInTheDocument();
    expect(container.querySelectorAll("h1")).toHaveLength(0);
    expect(screen.queryAllByRole("heading", { level: 1 })).toHaveLength(0);
  });

  it("renders exactly one busy main#main-content", () => {
    const { container } = renderLoading();

    expect(container.querySelectorAll("main")).toHaveLength(1);
    const main = screen.getByRole("main");
    expect(main).toHaveAttribute("id", "main-content");
    expect(main).toHaveAttribute("aria-busy", "true");
    expect(within(main).getByRole("status", { name: label })).toBeInTheDocument();
  });

  it("hides the decorative skeleton from assistive technology", () => {
    const { container } = renderLoading();

    const skeleton = container.querySelector("[data-loading-skeleton]");
    expect(skeleton).not.toBeNull();
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(skeleton?.textContent).toBe("");
    expect(skeleton?.querySelectorAll("a, button, input, [tabindex], [role]")).toHaveLength(0);
  });

  it("pulses only under the motion-safe prefix", () => {
    const { container } = renderLoading();

    const html = container.innerHTML;
    expect(html).toContain("motion-safe:animate-pulse");
    expect(html).not.toMatch(/(?<!motion-safe:)animate-pulse/);
    for (const element of container.querySelectorAll("[class*='animate-pulse']")) {
      const unprefixed = element.className
        .split(/\s+/)
        .filter((token) => token.includes("animate-pulse") && !token.startsWith("motion-safe:"));
      expect(unprefixed).toEqual([]);
    }
  });

  it("uses an Indonesian-only label and carries no user data in the main region", () => {
    renderLoading("account");

    const main = screen.getByRole("main");
    expect(main.textContent).toBe(`${label}…`);
    expect(main.textContent).not.toMatch(/\b(loading|please|wait|error|something)\b/i);
    expect(main.querySelectorAll("a, form, input, img")).toHaveLength(0);
    expect(main.innerHTML).not.toMatch(/token|@|\/orders\/|\/quote\//i);
  });
});
