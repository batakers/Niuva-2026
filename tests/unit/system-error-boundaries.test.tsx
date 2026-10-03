import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import AdminError from "@/app/admin/error";
import PublicError from "@/app/error";
import { SYSTEM_HEADING_ID, systemCopy } from "@/components/niuva/system-state-copy";

afterEach(cleanup);

const injected = {
  message: "SECRET-MESSAGE: database password rejected",
  stack: "Error: SECRET-STACK\n    at secretFunction (/srv/app/secret.ts:1:1)",
  digest: "DIGEST-1234567890",
  token: "Bearer TOKEN-abc123.def456",
};
const leakNeedles = ["SECRET-MESSAGE", "SECRET-STACK", "secretFunction", injected.digest, "TOKEN-abc123"];

function makeError(): Error & { digest?: string } {
  const error = new Error(injected.message);
  error.stack = injected.stack;
  return Object.assign(error, { digest: injected.digest, token: injected.token });
}

type BoundaryProps = Readonly<{ error: Error & { digest?: string }; reset: () => void; retry: () => void }>;

function makeProps(retry: () => void = vi.fn(), reset: () => void = vi.fn()): BoundaryProps {
  return { error: makeError(), reset, retry };
}

// `PublicError` only declares `retry`; Next.js also passes `error` and `reset`.
const PublicBoundary = PublicError as unknown as (props: BoundaryProps) => ReturnType<typeof PublicError>;

const boundaries = [
  { name: "public", Boundary: PublicBoundary, homeHref: "/", homeLabel: systemCopy.actions.home, copy: systemCopy.publicError },
  { name: "admin", Boundary: AdminError, homeHref: "/admin", homeLabel: systemCopy.actions.adminHome, copy: systemCopy.adminError },
] as const;

function expectNoLeak(root: Element | string) {
  if (typeof root === "string") {
    for (const needle of leakNeedles) expect(root).not.toContain(needle);
    return;
  }
  expect(root.textContent ?? "").not.toMatch(/SECRET|TOKEN-abc123|DIGEST-/);
  for (const element of [root, ...Array.from(root.querySelectorAll("*"))]) {
    for (const attribute of Array.from(element.attributes)) {
      for (const needle of leakNeedles) {
        expect(attribute.value).not.toContain(needle);
      }
    }
  }
  for (const needle of leakNeedles) expect(root.innerHTML).not.toContain(needle);
}

/** Browsers synthesize a click after Enter on a focused native button; jsdom does not. */
function activateWithKeyboard(button: HTMLElement) {
  button.focus();
  expect(document.activeElement).toBe(button);
  fireEvent.keyDown(button, { key: "Enter", code: "Enter" });
  fireEvent.click(button);
  fireEvent.keyUp(button, { key: "Enter", code: "Enter" });
}

describe.each(boundaries)("$name error boundary", ({ Boundary, homeHref, homeLabel, copy }) => {
  it("renders the main message and both recovery actions", () => {
    const { container } = render(<Boundary {...makeProps()} />);

    const main = container.querySelector("main");
    expect(main).not.toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(copy.title);
    expect(main?.querySelector("p")?.textContent).toBe(copy.description);

    const retryButton = screen.getByRole("button", { name: systemCopy.actions.retry });
    expect(retryButton).toHaveAttribute("type", "button");
    const home = screen.getByRole("link", { name: homeLabel });
    expect(home).toHaveAttribute("href", homeHref);
    expect(main).toContainElement(retryButton);
    expect(main).toContainElement(home);
  });

  it("calls retry exactly once per pointer click and never calls reset", () => {
    const retry = vi.fn();
    const reset = vi.fn();
    render(<Boundary {...makeProps(retry, reset)} />);

    const button = screen.getByRole("button", { name: systemCopy.actions.retry });
    expect(retry).not.toHaveBeenCalled();

    fireEvent.click(button);
    expect(retry).toHaveBeenCalledTimes(1);
    expect(retry).toHaveBeenLastCalledWith();

    fireEvent.click(button);
    expect(retry).toHaveBeenCalledTimes(2);
    expect(reset).not.toHaveBeenCalled();
  });

  it("calls retry exactly once per keyboard activation and never calls reset", () => {
    const retry = vi.fn();
    const reset = vi.fn();
    render(<Boundary {...makeProps(retry, reset)} />);

    activateWithKeyboard(screen.getByRole("button", { name: systemCopy.actions.retry }));

    expect(retry).toHaveBeenCalledTimes(1);
    expect(reset).not.toHaveBeenCalled();
  });

  it("still shows the same actions on a second render after retry throws", () => {
    const retry = vi.fn(() => {
      throw new Error("retry failed");
    });
    const swallow = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener("error", swallow);
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const first = render(<Boundary {...makeProps(retry)} />);
      fireEvent.click(screen.getByRole("button", { name: systemCopy.actions.retry }));
      expect(retry).toHaveBeenCalledTimes(1);
      first.unmount();

      render(<Boundary {...makeProps(retry)} />);
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(copy.title);
      expect(screen.getByRole("button", { name: systemCopy.actions.retry })).toBeEnabled();
      expect(screen.getByRole("link", { name: homeLabel })).toHaveAttribute("href", homeHref);
    } finally {
      window.removeEventListener("error", swallow);
      consoleError.mockRestore();
    }
  });

  it("gives both actions a min-h-11 touch target", () => {
    render(<Boundary {...makeProps()} />);

    expect(screen.getByRole("button", { name: systemCopy.actions.retry })).toHaveClass("min-h-11");
    expect(screen.getByRole("link", { name: homeLabel })).toHaveClass("min-h-11");
  });

  it("orders the actions retry first, then home, after the message", () => {
    render(<Boundary {...makeProps()} />);

    const heading = screen.getByRole("heading", { level: 1 });
    const retryButton = screen.getByRole("button", { name: systemCopy.actions.retry });
    const home = screen.getByRole("link", { name: homeLabel });
    const follows = Node.DOCUMENT_POSITION_FOLLOWING;

    expect(heading.compareDocumentPosition(retryButton) & follows).toBeTruthy();
    expect(retryButton.compareDocumentPosition(home) & follows).toBeTruthy();
    expect(retryButton.parentElement).toBe(home.parentElement);
    expect(retryButton.parentElement?.children[0]).toBe(retryButton);
    expect(retryButton.parentElement?.children[1]).toBe(home);
  });

  it("moves focus to the heading on mount", () => {
    render(<Boundary {...makeProps()} />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveAttribute("id", SYSTEM_HEADING_ID);
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(document.activeElement).toBe(heading);
  });

  it("never renders error.message, stack, digest or a token in text or attributes", () => {
    const { container } = render(<Boundary {...makeProps()} />);

    expectNoLeak(container);
    expect(container.textContent).not.toMatch(/digest|stack|exception/i);
  });
});

describe("public error boundary standalone frame", () => {
  it("wraps the message in SystemFrame with a single main#main-content", () => {
    const { container } = render(<PublicBoundary {...makeProps()} />);

    const frame = container.querySelector('[data-foundation-scope="system"]');
    expect(frame).not.toBeNull();
    expect(frame).toHaveAttribute("data-product-screen-proof-status", "pending-owner-review");
    expect(container.querySelectorAll("main")).toHaveLength(1);
    const main = container.querySelector("main#main-content");
    expect(main).not.toBeNull();
    expect(frame).toContainElement(main as HTMLElement);
    expect(main).toHaveAttribute("data-system-state", "error");
    expect(container.querySelectorAll("h1")).toHaveLength(1);
  });

  it("orders skip link, header logo link, then main", () => {
    const { container } = render(<PublicBoundary {...makeProps()} />);

    const frame = container.querySelector('[data-foundation-scope="system"]');
    const children = Array.from(frame?.children ?? []);
    const skip = children[0];
    expect(skip?.tagName).toBe("A");
    expect(skip).toHaveAttribute("href", "#main-content");

    const header = children.find((child) => child.tagName === "HEADER");
    const main = children.find((child) => child.tagName === "MAIN");
    expect(header).toBeDefined();
    expect(main).toBeDefined();
    expect(children.indexOf(header as Element)).toBeLessThan(children.indexOf(main as Element));
    expect(header?.querySelector('a[href="/"]')).not.toBeNull();
  });

  it("renders the same frame and main as static markup without leaks", () => {
    const markup = renderToStaticMarkup(<PublicBoundary {...makeProps()} />);

    expect(markup).toContain('data-foundation-scope="system"');
    expect(markup).toContain('<main id="main-content"');
    expect(markup).toContain(systemCopy.publicError.title);
    expectNoLeak(markup);
  });
});

describe("admin error boundary", () => {
  it("renders main#main-content directly, without the public frame", () => {
    const { container } = render(<AdminError {...makeProps()} />);

    expect(container.querySelector("[data-foundation-scope]")).toBeNull();
    expect(container.querySelector("header")).toBeNull();
    const main = container.querySelector("main#main-content");
    expect(main).toHaveAttribute("data-system-state", "admin-error");
    expect(container.firstElementChild?.getAttribute("href")).toBe("#main-content");
  });

  it("renders no user name, email, role or data-mutation claim", () => {
    const { container } = render(<AdminError {...makeProps()} />);

    expect(container.textContent).not.toMatch(/@|owner|admin niuva|tersimpan|berhasil|diubah/i);
  });

  it("produces identical markup for every error kind", () => {
    const html = (error: unknown) =>
      renderToStaticMarkup(
        <AdminError error={error as Error & { digest?: string }} reset={() => undefined} retry={() => undefined} />,
      );

    const baseline = html(new Error("baseline"));
    const kinds: unknown[] = [
      makeError(),
      new TypeError("type"),
      Object.assign(new RangeError("range"), { digest: "d-1" }),
      Object.assign(new Error("Unauthorized: FORBIDDEN"), { digest: injected.digest, name: "ForbiddenError" }),
      "plain string error",
      { message: injected.message, stack: injected.stack, digest: injected.digest },
      null,
      undefined,
    ];

    for (const kind of kinds) {
      expect(html(kind)).toBe(baseline);
    }
    expectNoLeak(baseline);
  });
});
