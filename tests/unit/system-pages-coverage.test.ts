// Feature: system-pages-and-error-states, Property 11
// Property 11: The loading coverage manifest is complete.
// Validates: Requirements 6.1, 6.9
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import AdminLoading from "@/app/admin/loading";

type ExclusionReason = "X1-404-contract" | "X2-redirect-guard" | "X3-root-wraps-admin" | "X4-non-product";

type ManifestEntry =
  | { status: "covered"; loading: string }
  | { status: "excluded"; reason: ExclusionReason };

const appDir = path.join(process.cwd(), "src", "app");

// Mirrors design.md "Keputusan B" inventory (21 non-admin `connection()` pages).
// Keys are page.tsx paths relative to src/app, using forward slashes.
const manifest: Record<string, ManifestEntry> = {
  "page.tsx": { status: "excluded", reason: "X3-root-wraps-admin" },
  "account/page.tsx": { status: "excluded", reason: "X2-redirect-guard" },
  "account/privacy/page.tsx": { status: "excluded", reason: "X2-redirect-guard" },
  "account/privacy/confirm/page.tsx": { status: "excluded", reason: "X2-redirect-guard" },
  "account/inquiries/[id]/page.tsx": { status: "excluded", reason: "X1-404-contract" },
  "account/orders/[id]/page.tsx": { status: "excluded", reason: "X1-404-contract" },
  "account/make/[id]/page.tsx": { status: "excluded", reason: "X1-404-contract" },
  "cart/page.tsx": { status: "covered", loading: "cart/loading.tsx" },
  "checkout/page.tsx": { status: "excluded", reason: "X2-redirect-guard" },
  "custom-print/page.tsx": { status: "excluded", reason: "X1-404-contract" },
  "custom-print/request/page.tsx": { status: "excluded", reason: "X2-redirect-guard" },
  "custom-print/requests/[token]/page.tsx": { status: "excluded", reason: "X1-404-contract" },
  "orders/[token]/page.tsx": { status: "excluded", reason: "X1-404-contract" },
  "quote/[token]/page.tsx": { status: "excluded", reason: "X1-404-contract" },
  "project-brief/page.tsx": { status: "excluded", reason: "X2-redirect-guard" },
  "services/[slug]/page.tsx": { status: "excluded", reason: "X1-404-contract" },
  "shop/page.tsx": { status: "excluded", reason: "X1-404-contract" },
  "shop/[slug]/page.tsx": { status: "excluded", reason: "X1-404-contract" },
  "demo/action-queue/page.tsx": { status: "excluded", reason: "X4-non-product" },
  "internal-testing/policy/page.tsx": { status: "excluded", reason: "X4-non-product" },
  "internal-testing/google-consent/page.tsx": { status: "excluded", reason: "X4-non-product" },
};

const exclusionReasons: readonly ExclusionReason[] = [
  "X1-404-contract",
  "X2-redirect-guard",
  "X3-root-wraps-admin",
  "X4-non-product",
];

// SHA-256 of src/app/admin/loading.tsx with CRLF normalized to LF (R6.9: unchanged).
const ADMIN_LOADING_SHA256 = "14ce07247f76014b97602c26d3c5779338d2e2465e5027dddd1051f2bd6838ea";

function isAdminPath(relative: string): boolean {
  return relative === "admin" || relative.startsWith("admin/");
}

function walk(directory: string, base = ""): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relative = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      files.push(...walk(path.join(directory, entry.name), relative));
    } else {
      files.push(relative);
    }
  }
  return files;
}

const allFiles = walk(appDir);

const scannedConnectionPages = allFiles
  .filter((file) => file.endsWith("page.tsx") && path.posix.basename(file) === "page.tsx" && !isAdminPath(file))
  .filter((file) => /\bconnection\s*\(\s*\)/.test(readFileSync(path.join(appDir, file), "utf8")))
  .sort();

const nonAdminLoadingFiles = allFiles
  .filter((file) => path.posix.basename(file) === "loading.tsx" && !isAdminPath(file))
  .sort();

describe("loading coverage manifest (Property 11)", () => {
  it("lists all 21 non-admin connection() pages found by the scan, and nothing stale", () => {
    expect(scannedConnectionPages).toHaveLength(21);
    expect(scannedConnectionPages).toEqual(Object.keys(manifest).sort());
  });

  it("gives every manifest entry a known status and, for excluded pages, a known reason", () => {
    for (const [page, entry] of Object.entries(manifest)) {
      if (entry.status === "excluded") {
        expect(exclusionReasons, `${page} has an unknown reason`).toContain(entry.reason);
      } else {
        expect(entry.status, page).toBe("covered");
      }
    }
  });

  it("requires a loading.tsx for every covered entry", () => {
    const covered = Object.entries(manifest).filter(([, entry]) => entry.status === "covered");
    expect(covered.length).toBeGreaterThan(0);
    for (const [page, entry] of covered) {
      if (entry.status !== "covered") continue;
      expect(existsSync(path.join(appDir, entry.loading)), `${page} is covered but ${entry.loading} is missing`).toBe(true);
      // The loading file must sit in the same segment as the covered page.
      expect(path.posix.dirname(entry.loading)).toBe(path.posix.dirname(page));
    }
  });

  it("lists every non-admin loading.tsx as a covered entry", () => {
    const coveredLoadingFiles = Object.values(manifest)
      .flatMap((entry) => (entry.status === "covered" ? [entry.loading] : []))
      .sort();
    expect(nonAdminLoadingFiles).toEqual(coveredLoadingFiles);
  });

  it("keeps excluded segments free of a loading.tsx in their own directory", () => {
    for (const [page, entry] of Object.entries(manifest)) {
      if (entry.status !== "excluded") continue;
      const loading = path.posix.join(path.posix.dirname(page), "loading.tsx");
      expect(nonAdminLoadingFiles, `${page} is excluded (${entry.reason}) but ${loading} exists`).not.toContain(loading);
    }
  });
});

describe("admin loading state is unchanged (R6.9)", () => {
  it("matches the reference hash of its current content", () => {
    const content = readFileSync(path.join(appDir, "admin", "loading.tsx"), "utf8").replace(/\r\n/g, "\n");
    expect(createHash("sha256").update(content).digest("hex")).toBe(ADMIN_LOADING_SHA256);
  });

  it("still renders main#main-content with role=status", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToStaticMarkup(AdminLoading());
    const main = container.querySelector("main#main-content");
    expect(main).not.toBeNull();
    expect(main?.getAttribute("role")).toBe("status");
    expect(container.querySelectorAll("main")).toHaveLength(1);
  });
});
