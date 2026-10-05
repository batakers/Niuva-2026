// Feature: system-pages-and-error-states, Property 13: Copy constraints
// Validates: Requirements 14.9, 1.8, 4.6, 6.5, 14.5
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { GlobalErrorView } from "@/app/global-error";
import { createAdminAuthUnavailableHtmlResponse } from "@/lib/auth/admin-proxy-response";
import { systemCopy } from "@/components/niuva/system-state-copy";

const MAX_WORDS_PER_SENTENCE = 20;
const FORBIDDEN_TERMS = ["exception", "stack", "digest"] as const;

// Function words that mark a sentence as English. The copy is Indonesian only.
const ENGLISH_MARKERS = new Set([
  "the", "and", "please", "try", "again", "went", "wrong", "something", "could",
  "cannot", "with", "your", "you", "is", "are", "was", "back", "to", "of", "an",
  "unavailable", "available", "loading", "found", "not", "sign", "in", "out",
]);

// Common Indonesian function words. A sentence of three or more words must use one.
const INDONESIAN_MARKERS = new Set([
  "yang", "atau", "dan", "ke", "di", "saat", "belum", "dapat", "tidak", "ini",
  "anda", "untuk", "dengan", "lalu", "kembali", "coba", "muat", "masuk", "keluar",
  "sudah", "pada", "dari", "akun", "halaman", "lagi", "lanjutkan", "terjadi",
  "ada", "lewati", "ruang", "data", "layanan", "akses", "sesi", "memuat",
]);

function collectStrings(value: unknown, trail: string, out: Array<[string, string]>): void {
  if (typeof value === "string") {
    out.push([trail, value]);
    return;
  }

  if (typeof value === "object" && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      collectStrings(child, `${trail}.${key}`, out);
    }
  }
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?\u2026])\s+/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function wordsOf(sentence: string): string[] {
  return sentence
    .split(/\s+/u)
    .map((token) => token.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ""))
    .filter((token) => /[\p{L}\p{N}]/u.test(token));
}

/** Visible text chunks of an HTML document: style/script removed, one chunk per tag boundary. */
function htmlTextChunks(html: string): string[] {
  return html
    .replace(/<style[\s\S]*?<\/style>/giu, "\n")
    .replace(/<script[\s\S]*?<\/script>/giu, "\n")
    .replace(/<[^>]*>/gu, "\n")
    .split("\n")
    .map((chunk) => chunk.trim())
    .filter((chunk) => chunk.length > 0);
}

function assertCopyConstraints(label: string, text: string): void {
  expect(text.trim().length, `${label}: empty`).toBeGreaterThan(0);

  const lower = text.toLowerCase();
  for (const term of FORBIDDEN_TERMS) {
    expect(lower.includes(term), `${label}: contains "${term}"`).toBe(false);
  }

  for (const sentence of splitSentences(text)) {
    const words = wordsOf(sentence);
    expect(words.length, `${label}: "${sentence}" has ${words.length} words`).toBeLessThanOrEqual(
      MAX_WORDS_PER_SENTENCE,
    );

    const english = words.filter((word) => ENGLISH_MARKERS.has(word));
    expect(english, `${label}: "${sentence}" looks English`).toEqual([]);

    if (words.length >= 3) {
      expect(
        words.some((word) => INDONESIAN_MARKERS.has(word)),
        `${label}: "${sentence}" has no Indonesian marker`,
      ).toBe(true);
    }
  }
}

describe("Property 13: system copy constraints", () => {
  const copyStrings: Array<[string, string]> = [];
  collectStrings(systemCopy, "systemCopy", copyStrings);

  it("has copy for RESOURCE_BUSY", () => {
    expect(systemCopy.resourceBusy.title.length).toBeGreaterThan(0);
    expect(systemCopy.resourceBusy.description.length).toBeGreaterThan(0);
    expect(copyStrings.map(([label]) => label)).toContain("systemCopy.resourceBusy.title");
  });

  it("collects every systemCopy string", () => {
    expect(copyStrings.length).toBeGreaterThanOrEqual(25);
  });

  it.each(copyStrings)("%s meets the copy constraints", (label, text) => {
    assertCopyConstraints(label, text);
  });

  it("proxy HTML response text meets the copy constraints", async () => {
    const response = createAdminAuthUnavailableHtmlResponse();
    const html = await response.text();
    const chunks = htmlTextChunks(html);

    expect(response.headers.get("content-language")).toBe("id");
    expect(chunks.length).toBeGreaterThanOrEqual(4);
    for (const chunk of chunks) {
      assertCopyConstraints(`proxyHtml:"${chunk}"`, chunk);
    }
  });

  it("global-error markup text meets the copy constraints", () => {
    const html = renderToStaticMarkup(createElement(GlobalErrorView, { onRetry: () => undefined }));
    const chunks = htmlTextChunks(html);

    expect(chunks).toContain(systemCopy.globalError.title);
    expect(chunks).toContain(systemCopy.globalError.description);
    for (const chunk of chunks) {
      assertCopyConstraints(`globalError:"${chunk}"`, chunk);
    }
  });
});

describe("Property 13: literal visual values in new source files", () => {
  const root = process.cwd();
  const newSourceFiles = [
    "src/app/not-found.tsx",
    "src/app/error.tsx",
    "src/app/global-error.tsx",
    "src/app/admin/error.tsx",
    "src/app/admin/not-found.tsx",
    "src/app/admin/admin-access-view.tsx",
    "src/app/admin/admin-record-loader.ts",
    "src/app/orders/[token]/next-action.ts",
    "src/components/niuva/skip-link.tsx",
    "src/components/niuva/system-focus-target.tsx",
    "src/components/niuva/system-state-view.tsx",
    "src/components/niuva/system-frame.tsx",
    "src/components/niuva/public-loading-state.tsx",
    "src/components/niuva/admin-access-actions.tsx",
    "src/components/niuva/system-state-copy.ts",
    "src/app/cart/loading.tsx",
  ] as const;
  // The documented inline palette lives only in the proxy HTML module and is exempt.
  const exempt = "src/lib/auth/admin-proxy-response.ts";

  const HEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/u;
  const COLOR_FUNCTION = /\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\s*\(/iu;
  const ARBITRARY_PX = /\[[^\]\s]*\d+(?:\.\d+)?px[^\]\s]*\]/u;

  function stripComments(source: string): string {
    return source.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/(^|[^:])\/\/.*$/gmu, "$1");
  }

  it("the exempt proxy module is the only place that keeps literal colors", () => {
    const source = readFileSync(path.join(root, exempt), "utf8");
    expect(HEX.test(stripComments(source))).toBe(true);
  });

  it.each(newSourceFiles)("%s has no hex, rgb(), hsl() or arbitrary px values", (file) => {
    const absolute = path.join(root, file);
    expect(existsSync(absolute), `${file} is missing`).toBe(true);

    const source = stripComments(readFileSync(absolute, "utf8"));
    expect(HEX.exec(source)?.[0], `${file}: hex color`).toBeUndefined();
    expect(COLOR_FUNCTION.exec(source)?.[0], `${file}: color function`).toBeUndefined();
    expect(ARBITRARY_PX.exec(source)?.[0], `${file}: arbitrary px`).toBeUndefined();
  });
});
