// Feature: system-pages-and-error-states, Property 5
// Property 5: System renderers never leak injected strings.
// Validates: Requirements 1.9, 2.5, 2.7, 3.5, 4.4, 5.3, 5.9, 7.11, 8.8
import { cleanup, render } from "@testing-library/react";
import type { ComponentType, ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock("@/lib/env/server", () => ({ isLocalDemoMode: () => false }));

import { AdminAccessView } from "@/app/admin/admin-access-view";
import { ADMIN_ACCESS_STATES } from "@/app/admin/admin-page-access";
import AdminError from "@/app/admin/error";
import AdminNotFound, { metadata as adminNotFoundMetadata } from "@/app/admin/not-found";
import PublicError from "@/app/error";
import GlobalError, { GlobalErrorView } from "@/app/global-error";
import RootNotFound, { metadata as rootNotFoundMetadata } from "@/app/not-found";
import { PublicLoadingState } from "@/components/niuva/public-loading-state";
import { systemCopy } from "@/components/niuva/system-state-copy";
import { createAdminAuthUnavailableHtmlResponse } from "@/lib/auth/admin-proxy-response";
import { emailCorpus, filePathCorpus, forEachCase, scriptFragmentCorpus, tokenCorpus } from "../helpers/corpus";

afterEach(() => {
  cleanup();
  window.history.replaceState(null, "", "/");
});

type BoundaryError = Error & { digest?: string };
type BoundaryProps = Readonly<{ error: BoundaryError; reset: () => void; retry: () => void }>;
type HostileProps = ComponentType<Record<string, unknown>>;

// `PublicError` and `GlobalError` only declare `retry`; Next.js also passes `error` and `reset`.
const PublicBoundary = PublicError as unknown as (props: BoundaryProps) => ReturnType<typeof PublicError>;
const noop = () => undefined;

/** Every injected field a renderer could be tempted to print, all carrying the same needle. */
function hostileError(needle: string): BoundaryError {
  const error = new Error(needle);
  error.name = needle;
  error.stack = `${needle}\n    at ${needle} (${needle}:1:1)`;
  return Object.assign(error, { digest: needle, token: needle, email: needle, path: needle });
}

function boundaryProps(needle: string): BoundaryProps {
  return { error: hostileError(needle), reset: noop, retry: noop };
}

/** Route-param style props that the no-prop pages must ignore. */
function hostileRouteProps(needle: string): Record<string, unknown> {
  return {
    params: Promise.resolve({ token: needle, id: needle, slug: needle }),
    searchParams: Promise.resolve({ token: needle }),
    token: needle,
    id: needle,
    slug: needle,
    error: hostileError(needle),
  };
}

const RootNotFoundHostile = RootNotFound as unknown as HostileProps;
const AdminNotFoundHostile = AdminNotFound as unknown as HostileProps;
const AdminAccessViewHostile = AdminAccessView as unknown as HostileProps;
const PublicLoadingStateHostile = PublicLoadingState as unknown as HostileProps;
const GlobalErrorHostile = GlobalError as unknown as HostileProps;

type Surface = Readonly<{ name: string; render: (needle: string) => ReactElement }>;

const BASELINE = "baseline";

const surfaces: readonly Surface[] = [
  { name: "Root_Not_Found", render: (n) => <RootNotFoundHostile {...hostileRouteProps(n)} /> },
  { name: "Public_Error_Boundary", render: (n) => <PublicBoundary {...boundaryProps(n)} /> },
  { name: "GlobalError", render: (n) => <GlobalErrorHostile retry={noop} {...hostileRouteProps(n)} /> },
  { name: "Admin_Error_Boundary", render: (n) => <AdminError {...boundaryProps(n)} /> },
  { name: "Admin not-found", render: (n) => <AdminNotFoundHostile {...hostileRouteProps(n)} /> },
  ...ADMIN_ACCESS_STATES.map(
    (state): Surface => ({
      name: `AdminAccessView ${state}`,
      render: (n) => <AdminAccessViewHostile state={state} {...hostileRouteProps(n)} />,
    }),
  ),
  {
    name: "PublicLoadingState",
    render: (n) => <PublicLoadingStateHostile label={systemCopy.loading.cart} scope="cart" {...hostileRouteProps(n)} />,
  },
];

/** Hostile strings: tokens, emails, file paths and script fragments, each with 100+ seeded cases. */
const corpora = {
  token: tokenCorpus(),
  email: emailCorpus(),
  path: filePathCorpus(),
  script: scriptFragmentCorpus(),
} as const;
const allNeedles = Object.values(corpora).flat();

// A needle shorter than this (or one that is part of the static copy) cannot be told apart from
// legitimate markup by a substring check. Those cases are still rendered and still have to match
// the baseline for the Admin_Error_Boundary.
const MIN_NEEDLE_LENGTH = 4;

/** Parse markup as a full HTML document; fragments land in `body`. */
function parse(markup: string): Document {
  return new DOMParser().parseFromString(`<!DOCTYPE html>${markup}`, "text/html");
}

function textAndAttributeValues(doc: Document): string[] {
  const values = [doc.title, doc.documentElement.textContent ?? ""];
  for (const element of [doc.documentElement, ...Array.from(doc.querySelectorAll("*"))]) {
    for (const attribute of Array.from(element.attributes)) values.push(attribute.name, attribute.value);
  }
  return values;
}

const normalize = (value: string) => value.trim().toLowerCase();

function isMeaningful(needle: string, baselineHaystack: string): boolean {
  const probe = normalize(needle);
  return probe.length >= MIN_NEEDLE_LENGTH && !baselineHaystack.includes(probe);
}

/** Fails if `needle` shows up in markup, text, or any attribute (`title`, `aria-*`, `data-*`, ...). */
function expectNoNeedle(markup: string, needle: string, baselineHaystack: string) {
  if (!isMeaningful(needle, baselineHaystack)) return;
  const probe = normalize(needle);
  expect(normalize(markup), "raw markup").not.toContain(probe);
  for (const value of textAndAttributeValues(parse(markup))) {
    expect(normalize(value), "text or attribute value").not.toContain(probe);
  }
}

const haystackOf = (markup: string) => normalize([markup, ...textAndAttributeValues(parse(markup))].join("\n"));

describe("Property 5: system renderers never leak injected strings", () => {
  it("uses at least 100 seeded needles per corpus and covers every system surface", () => {
    for (const cases of Object.values(corpora)) expect(cases.length).toBeGreaterThanOrEqual(100);
    expect(ADMIN_ACCESS_STATES).toHaveLength(3);
    expect(surfaces.map((surface) => surface.name)).toEqual(
      expect.arrayContaining(["Root_Not_Found", "Public_Error_Boundary", "GlobalError", "Admin_Error_Boundary", "Admin not-found"]),
    );
    expect(surfaces).toHaveLength(5 + ADMIN_ACCESS_STATES.length + 1);
  });

  for (const surface of surfaces) {
    it(`${surface.name}: injected message, stack, digest, name, token, email, path and script never render`, () => {
      const baselineMarkup = renderToStaticMarkup(surface.render(BASELINE));
      const baselineHaystack = haystackOf(baselineMarkup);
      const meaningful = allNeedles.filter((needle) => isMeaningful(needle, baselineHaystack));
      expect(meaningful.length).toBeGreaterThanOrEqual(100);

      forEachCase(allNeedles, (needle) => {
        expectNoNeedle(renderToStaticMarkup(surface.render(needle)), needle, baselineHaystack);
      });
    }, 60_000);
  }

  it("Admin_Error_Boundary markup is identical to its baseline for every error kind and injected string", () => {
    const html = (error: unknown) =>
      renderToStaticMarkup(
        <AdminError error={error as BoundaryError} reset={noop} retry={noop} />,
      );
    const baseline = html(new Error(BASELINE));

    forEachCase(allNeedles, (needle) => {
      expect(html(hostileError(needle))).toBe(baseline);
      expect(html(needle)).toBe(baseline);
      expect(html({ message: needle, stack: needle, digest: needle, name: needle })).toBe(baseline);
    });
    for (const kind of [null, undefined, new TypeError("type"), Object.assign(new RangeError("range"), { digest: "d-1" })]) {
      expect(html(kind)).toBe(baseline);
    }
  }, 60_000);

  it("GlobalErrorView and the GlobalError document render the same body for every injected error", () => {
    const view = renderToStaticMarkup(<GlobalErrorView onRetry={noop} />);
    const baselineHaystack = haystackOf(view);

    forEachCase(allNeedles, (needle) => {
      const document_ = renderToStaticMarkup(<GlobalErrorHostile retry={noop} error={hostileError(needle)} />);
      expectNoNeedle(document_, needle, baselineHaystack);
      expect(document_).toContain(view);
    });
  }, 60_000);

  it("keeps static metadata of both not-found pages free of injected strings", () => {
    const serialized = JSON.stringify([rootNotFoundMetadata, adminNotFoundMetadata]);
    const haystack = normalize(serialized);

    for (const needle of allNeedles) {
      // Unlike markup, metadata has no shared chrome: nothing is exempt from the check.
      if (normalize(needle).length >= MIN_NEEDLE_LENGTH) {
        expect(haystack, `metadata leaked ${JSON.stringify(needle)}`).not.toContain(normalize(needle));
      }
    }
    expect(typeof rootNotFoundMetadata.title).toBe("string");
    expect(typeof adminNotFoundMetadata.title).toBe("string");
  });

  it("renders no injected string in the DOM, document.title or metadata after mount with a hostile URL", () => {
    // Same surfaces through the DOM, with the needle also placed in the address bar.
    const domSurfaces = surfaces.filter((surface) => surface.name !== "GlobalError");
    const sample = [...corpora.token.slice(0, 20), ...corpora.email.slice(0, 15), ...corpora.path.slice(0, 15), ...corpora.script.slice(0, 15)];

    for (const surface of domSurfaces) {
      window.history.replaceState(null, "", "/");
      const baseline = render(surface.render(BASELINE));
      const baselineHaystack = haystackOf(baseline.container.innerHTML);
      cleanup();

      forEachCase(sample, (needle) => {
        window.history.replaceState(null, "", `/orders/${encodeURIComponent(needle)}?token=${encodeURIComponent(needle)}`);
        const { container } = render(surface.render(needle));
        expectNoNeedle(container.innerHTML, needle, baselineHaystack);
        if (isMeaningful(needle, baselineHaystack)) {
          expect(normalize(document.title)).not.toContain(normalize(needle));
          expect(normalize(document.head.innerHTML)).not.toContain(normalize(needle));
        }
        cleanup();
      });
    }
  }, 120_000);

  it("proxy HTML 503 is a static document that contains no injected string", async () => {
    const baselineHtml = await createAdminAuthUnavailableHtmlResponse().text();
    const baselineHaystack = haystackOf(baselineHtml);

    // The factory takes no arguments, so no request data can reach the body or headers.
    expect(createAdminAuthUnavailableHtmlResponse.length).toBe(0);

    for (const needle of allNeedles) {
      const response = createAdminAuthUnavailableHtmlResponse();
      const html = await response.text();
      expect(html).toBe(baselineHtml);
      expectNoNeedle(html, needle, baselineHaystack);
      if (isMeaningful(needle, baselineHaystack)) {
        const headers = normalize(Array.from(response.headers.entries()).flat().join("\n"));
        expect(headers).not.toContain(normalize(needle));
      }
    }
    expect(baselineHtml).not.toMatch(/\$\{|undefined|\[object/);
  }, 60_000);
});
