import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { isValidElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import GlobalError, { GlobalErrorView } from "@/app/global-error";
import { systemCopy } from "@/components/niuva/system-state-copy";

afterEach(cleanup);

const injected = {
  message: "SECRET-MESSAGE: database password rejected",
  stack: "Error: SECRET-STACK\n    at secretFunction (/srv/app/secret.ts:1:1)",
  digest: "DIGEST-1234567890",
};

function renderDocument(retry: () => void = () => undefined) {
  // Next.js passes `error` to the component; the type only declares `retry`.
  const props = { retry, error: Object.assign(new Error(injected.message), injected) };
  const markup = renderToStaticMarkup(<GlobalError {...props} />);
  const doc = new DOMParser().parseFromString(`<!DOCTYPE html>${markup}`, "text/html");
  return { markup, doc };
}

describe("GlobalError document", () => {
  it("declares Indonesian html, title, robots and body", () => {
    const { markup, doc } = renderDocument();

    expect(markup.startsWith("<html")).toBe(true);
    expect(doc.documentElement.tagName).toBe("HTML");
    expect(doc.documentElement.getAttribute("lang")).toBe("id");
    expect(doc.title).toBe(systemCopy.globalError.title);
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe("noindex, nofollow");
    expect(doc.body).not.toBeNull();
    expect(markup).toContain("<body");
  });

  it("renders the skip link before any other body content", () => {
    const { doc } = renderDocument();

    const first = doc.body.firstElementChild;
    expect(first?.tagName).toBe("A");
    expect(first?.getAttribute("href")).toBe("#main-content");
    expect(first?.textContent).toBe("Lewati ke konten utama");
  });

  it("renders exactly one h1 and one main#main-content with the copy", () => {
    const { doc } = renderDocument();

    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.querySelectorAll("main")).toHaveLength(1);
    expect(doc.querySelectorAll("main#main-content")).toHaveLength(1);
    expect(doc.querySelector("main h1")?.textContent).toBe(systemCopy.globalError.title);
    expect(doc.querySelector("main p")?.textContent).toBe(systemCopy.globalError.description);
  });

  it("renders the retry button and a plain home anchor inside main", () => {
    const { doc } = renderDocument();

    const button = doc.querySelector("main button");
    expect(button?.getAttribute("type")).toBe("button");
    expect(button?.textContent).toBe(systemCopy.actions.retry);

    const home = doc.querySelector('main a[href="/"]');
    expect(home?.textContent).toBe(systemCopy.actions.home);
    expect(doc.querySelectorAll("main a")).toHaveLength(1);
  });

  it("never renders the injected error message, stack or digest", () => {
    const { markup } = renderDocument();

    expect(markup).not.toContain("SECRET-MESSAGE");
    expect(markup).not.toContain("SECRET-STACK");
    expect(markup).not.toContain("secretFunction");
    expect(markup).not.toContain(injected.digest);
    expect(markup).not.toMatch(/digest|stack/i);
  });
});

describe("GlobalErrorView retry", () => {
  it("calls retry exactly once per activation", () => {
    const retry = vi.fn();
    render(<GlobalErrorView onRetry={retry} />);

    const button = screen.getByRole("button", { name: systemCopy.actions.retry });
    expect(retry).not.toHaveBeenCalled();

    fireEvent.click(button);
    expect(retry).toHaveBeenCalledTimes(1);

    fireEvent.click(button);
    expect(retry).toHaveBeenCalledTimes(2);
  });

  it("keeps the home link as a plain anchor to /", () => {
    render(<GlobalErrorView onRetry={() => undefined} />);

    const home = screen.getByRole("link", { name: systemCopy.actions.home });
    expect(home).toHaveAttribute("href", "/");
  });

  it("wires the default export's retry prop to GlobalErrorView once per call", () => {
    const retry = vi.fn();
    const tree = GlobalError({ retry }) as ReactElement<{ children?: ReactNode }>;

    function findView(node: ReactNode): ReactElement<{ onRetry: () => void }> | null {
      if (!isValidElement<{ children?: ReactNode; onRetry?: () => void }>(node)) return null;
      if (node.type === GlobalErrorView) return node as ReactElement<{ onRetry: () => void }>;
      const children = Array.isArray(node.props.children) ? node.props.children : [node.props.children];
      for (const child of children as ReactNode[]) {
        const found = findView(child);
        if (found) return found;
      }
      return null;
    }

    const view = findView(tree);
    expect(view).not.toBeNull();
    view?.props.onRetry();
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
