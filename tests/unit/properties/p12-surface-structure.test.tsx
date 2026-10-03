// Feature: system-pages-and-error-states, Property 12
// Property 12: Structural invariants of system surfaces.
// Validates: Requirements 14.1, 14.2, 14.3, 7.10, 3.8, 6.3, 6.7
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/image", () => ({ default: () => null }));
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock("@clerk/nextjs", () => ({ useClerk: () => ({ signOut: vi.fn() }) }));
vi.mock("@/lib/env/server", () => ({ isLocalDemoMode: () => false }));

import { AdminAccessView } from "@/app/admin/admin-access-view";
import { ADMIN_ACCESS_STATES } from "@/app/admin/admin-page-access";
import AdminError from "@/app/admin/error";
import AdminNotFound from "@/app/admin/not-found";
import PublicError from "@/app/error";
import GlobalError from "@/app/global-error";
import RootNotFound from "@/app/not-found";
import { PublicLoadingState } from "@/components/niuva/public-loading-state";
import { typographySystemTokens } from "@/design/typography";
import { createAdminAuthUnavailableHtmlResponse } from "@/lib/auth/admin-proxy-response";
import { forEachCase, tokenCorpus } from "../helpers/corpus";

type BoundaryError = Error & { digest?: string };
type BoundaryProps = Readonly<{ error: BoundaryError; reset: () => void; retry: () => void }>;

// `PublicError` only declares `retry`; Next.js also passes `error` and `reset`.
const PublicBoundary = PublicError as unknown as (props: BoundaryProps) => ReturnType<typeof PublicError>;

const noop = () => undefined;

function boundaryProps(message: string): BoundaryProps {
  const error = Object.assign(new Error(message), { digest: `digest-${message.length}` });
  return { error, reset: noop, retry: noop };
}

/** Parse rendered markup as a full HTML document; fragments land in `body`. */
function parse(markup: string): Document {
  return new DOMParser().parseFromString(`<!DOCTYPE html>${markup}`, "text/html");
}

const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
const SKIP_LINK = 'a[href="#main-content"]';

/**
 * PublicShell header and footer (`data-home-section`) are shared chrome owned by
 * the public shell, not by the system surface. Everything else is system-owned.
 */
const inSharedChrome = (element: Element) => element.closest("[data-home-section]") !== null;

const INDONESIAN_HINT =
  /\b(yang|dan|atau|tidak|belum|Anda|halaman|Coba|kembali|data|akses|lagi|untuk|masuk|ruang|tersedia|terjadi|gagal|dibuka|ditemukan|autentikasi)\b/i;

// Literal colors and arbitrary pixel lengths inside Tailwind arbitrary values.
const LITERAL_COLOR = /\[[^\]]*(#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|oklch\(\s*\d)[^\]]*\]/i;
const ARBITRARY_PX = /\[[^\]]*\d(?:\.\d+)?px[^\]]*\]/i;

// `src/design/typography.ts` is the approved shared type contract and is the one
// place arbitrary px classes are allowed; exempt exactly its tokens, nothing else.
const typographyTokens = new Set(
  Object.values(typographySystemTokens).flatMap((entry) => entry.className.split(/\s+/)),
);
const withoutTypographyTokens = (className: string) =>
  className
    .split(/\s+/)
    .filter((token) => !typographyTokens.has(token))
    .join(" ");

type Surface = Readonly<{ name: string; render: () => ReactElement }>;

const seededMessages = tokenCorpus().slice(0, 30);

const surfaces: readonly Surface[] = [
  { name: "Root_Not_Found in PublicShell", render: () => <RootNotFound /> },
  ...seededMessages.map(
    (message, index): Surface => ({
      name: `Public_Error_Boundary (error #${index})`,
      render: () => <PublicBoundary {...boundaryProps(message)} />,
    }),
  ),
  ...seededMessages.map(
    (message, index): Surface => ({
      name: `Admin_Error_Boundary (error #${index})`,
      render: () => <AdminError {...boundaryProps(message)} />,
    }),
  ),
  {
    name: "GlobalError document",
    render: () => <GlobalError {...({ retry: noop, error: new Error("boom") } as { retry: () => void })} />,
  },
  { name: "Admin not-found", render: () => <AdminNotFound /> },
  ...ADMIN_ACCESS_STATES.map(
    (state): Surface => ({ name: `AdminAccessView ${state}`, render: () => <AdminAccessView state={state} /> }),
  ),
];

function assertSystemSurfaceStructure(doc: Document) {
  // Exactly one non-empty Indonesian h1.
  const headings = doc.querySelectorAll("h1");
  expect(headings).toHaveLength(1);
  const title = headings[0]?.textContent?.trim() ?? "";
  expect(title).not.toBe("");
  expect(title).toMatch(INDONESIAN_HINT);

  // Exactly one main#main-content and nothing else with that id.
  expect(doc.querySelectorAll("main")).toHaveLength(1);
  expect(doc.querySelectorAll("main#main-content")).toHaveLength(1);
  expect(doc.querySelectorAll("#main-content")).toHaveLength(1);

  // Exactly one skip link, and it is the first focusable element in the document.
  expect(doc.querySelectorAll(SKIP_LINK)).toHaveLength(1);
  const focusables = Array.from(doc.querySelectorAll(FOCUSABLE));
  expect(focusables[0]).toBe(doc.querySelector(SKIP_LINK));
  expect(focusables[0]?.textContent?.trim()).toBe("Lewati ke konten utama");

  // Every other link/button in system-owned markup is a 44px target.
  const targets = focusables.filter((element) => !element.matches(SKIP_LINK) && !inSharedChrome(element));
  expect(targets.length).toBeGreaterThan(0);
  for (const target of targets) {
    expect(target.classList.contains("min-h-11"), `missing min-h-11 on <${target.tagName.toLowerCase()}> "${target.textContent?.trim()}"`).toBe(true);
  }

  // No non-essential animation, no literal colors, no arbitrary px in class names.
  for (const element of Array.from(doc.querySelectorAll("[class]"))) {
    if (inSharedChrome(element)) continue;
    const className = withoutTypographyTokens(element.getAttribute("class") ?? "");
    expect(className, `animation class on <${element.tagName.toLowerCase()}>`).not.toMatch(/(^|\s|:)animate-/);
    expect(className, `literal color in class of <${element.tagName.toLowerCase()}>`).not.toMatch(LITERAL_COLOR);
    expect(className, `arbitrary px in class of <${element.tagName.toLowerCase()}>`).not.toMatch(ARBITRARY_PX);
  }
}

describe("Property 12: structural invariants of system surfaces", () => {
  it("covers Root_Not_Found, both boundaries, GlobalError, admin not-found and all three access states", () => {
    expect(surfaces.length).toBeGreaterThanOrEqual(1 + 30 + 30 + 1 + 1 + ADMIN_ACCESS_STATES.length);
    expect(ADMIN_ACCESS_STATES).toHaveLength(3);
  });

  it("holds the shared structure on every system surface", () => {
    forEachCase(
      surfaces.map((surface) => surface.name),
      (name, index) => {
        const surface = surfaces[index];
        expect(surface?.name).toBe(name);
        assertSystemSurfaceStructure(parse(renderToStaticMarkup((surface as Surface).render())));
      },
    );
  });

  it("keeps the Public_Error_Boundary skip link ahead of the frame logo link", () => {
    const doc = parse(renderToStaticMarkup(<PublicBoundary {...boundaryProps("x")} />));
    const focusables = Array.from(doc.querySelectorAll(FOCUSABLE));
    expect(focusables[0]).toBe(doc.querySelector(SKIP_LINK));
    expect(focusables.length).toBeGreaterThan(1);
  });

  it("gives the proxy HTML 503 one h1, one main#main-content, a leading skip link and 44px targets", async () => {
    const response = createAdminAuthUnavailableHtmlResponse();
    const html = await response.text();
    const doc = parse(html);

    expect(doc.documentElement.getAttribute("lang")).toBe("id");
    expect(doc.querySelectorAll("h1")).toHaveLength(1);
    expect(doc.querySelector("h1")?.textContent?.trim()).toMatch(INDONESIAN_HINT);
    expect(doc.querySelectorAll("main#main-content")).toHaveLength(1);
    expect(doc.querySelectorAll("main")).toHaveLength(1);

    const focusables = Array.from(doc.querySelectorAll(FOCUSABLE));
    expect(focusables[0]).toBe(doc.querySelector(SKIP_LINK));
    expect(doc.querySelectorAll(SKIP_LINK)).toHaveLength(1);

    // Static CSS, so the 44px target is asserted on the rule for each class.
    const css = doc.querySelector("style")?.textContent ?? "";
    for (const target of focusables) {
      const className = Array.from(target.classList)[0];
      expect(className, "interactive element without a styled class").toBeTruthy();
      expect(css).toMatch(new RegExp(`\\.${className}\\{[^}]*min-height:44px`));
    }
    expect(focusables.length).toBe(2);

    // No motion at all in the static document.
    expect(css).not.toMatch(/animation|transition|@keyframes/i);
  });
});

describe("Property 12: PublicLoadingState structure", () => {
  const scopes = ["shop", "cart", "account", "orders", "custom-print"] as const;

  it.each(scopes)("has one labelled status, zero h1 and one main (%s)", (scope) => {
    const label = `Memuat ${scope}`;
    const doc = parse(renderToStaticMarkup(<PublicLoadingState label={label} scope={scope} />));

    const statuses = doc.querySelectorAll('[role="status"]');
    expect(statuses).toHaveLength(1);
    expect(statuses[0]?.getAttribute("aria-label")).toBe(label);
    expect(statuses[0]?.getAttribute("aria-label")?.trim()).not.toBe("");

    expect(doc.querySelectorAll("h1")).toHaveLength(0);
    expect(doc.querySelectorAll("main")).toHaveLength(1);
    expect(doc.querySelectorAll("main#main-content")).toHaveLength(1);
    expect(doc.querySelector("main")?.getAttribute("aria-busy")).toBe("true");

    // The skip link still leads, and the only motion is motion-safe gated.
    expect(Array.from(doc.querySelectorAll(FOCUSABLE))[0]).toBe(doc.querySelector(SKIP_LINK));
    for (const element of Array.from(doc.querySelectorAll("[class]"))) {
      if (inSharedChrome(element)) continue;
      const className = withoutTypographyTokens(element.getAttribute("class") ?? "");
      for (const token of className.split(/\s+/)) {
        if (token.includes("animate-")) expect(token.startsWith("motion-safe:")).toBe(true);
      }
      expect(className).not.toMatch(LITERAL_COLOR);
      expect(className).not.toMatch(ARBITRARY_PX);
    }
  });
});
