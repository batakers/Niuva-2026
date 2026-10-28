// @vitest-environment node
/**
 * Netlify bundles the proxy as an edge function, where the PostgreSQL driver
 * cannot load (T03 build failure, 27 October 2026). The proxy's static import
 * graph must therefore never reach the database client or the auth engine.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const FORBIDDEN_PACKAGES = [/^pg(\/|$)/, /^@prisma\//, /^better-auth(\/|$)/, /^nodemailer(\/|$)/];
const FORBIDDEN_FILES = [/^src\/generated\/prisma\//, /^src\/lib\/db\//, /^src\/lib\/auth\/admin-engine\.ts$/];
// Value imports and re-exports; `import type` / `export type` are erased at build time.
const IMPORT_PATTERN = /^\s*(?:import|export)\s+(?!type\s)(?:[^"';]*?\bfrom\s+)?["']([^"']+)["']/gm;

function resolveLocal(specifier: string, from: string): string | null {
  const base = specifier.startsWith("@/") ? path.join(ROOT, "src", specifier.slice(2)) : path.resolve(path.dirname(from), specifier);

  for (const suffix of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const candidate = base + suffix;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }

  return null;
}

function collectGraph(entry: string): { files: Map<string, string | null>; packages: Map<string, string> } {
  const files = new Map<string, string | null>();
  const packages = new Map<string, string>();
  const pending: Array<[string, string | null]> = [[entry, null]];

  while (pending.length > 0) {
    const [file, parent] = pending.pop() as [string, string | null];
    if (files.has(file)) continue;
    files.set(file, parent);

    for (const match of readFileSync(file, "utf8").matchAll(IMPORT_PATTERN)) {
      const specifier = match[1] as string;

      if (specifier.startsWith("@/") || specifier.startsWith(".")) {
        const resolved = resolveLocal(specifier, file);
        if (resolved === null) throw new Error(`Unresolved import ${specifier} in ${file}`);
        pending.push([resolved, file]);
      } else if (!packages.has(specifier)) {
        packages.set(specifier, file);
      }
    }
  }

  return { files, packages };
}

const relative = (file: string) => path.relative(ROOT, file).split(path.sep).join("/");

describe("proxy edge bundle", () => {
  const { files, packages } = collectGraph(path.join(ROOT, "src", "proxy.ts"));

  it("never imports the database driver, Prisma, Better Auth or mail transport", () => {
    const offending = [...packages].filter(([specifier]) => FORBIDDEN_PACKAGES.some((pattern) => pattern.test(specifier)));

    expect(offending.map(([specifier, from]) => `${specifier} <- ${relative(from)}`)).toEqual([]);
  });

  it("never reaches the Prisma client, database helpers or the Admin auth engine", () => {
    const offending = [...files.keys()].map(relative).filter((file) => FORBIDDEN_FILES.some((pattern) => pattern.test(file)));

    expect(offending).toEqual([]);
  });

  it("detects a forbidden import when one is present", () => {
    // Guards the scanner itself: requireAdmin() legitimately uses the engine.
    const { files: adminFiles, packages: adminPackages } = collectGraph(path.join(ROOT, "src", "lib", "auth", "admin.ts"));

    expect([...adminPackages.keys()].some((specifier) => /^better-auth(\/|$)/.test(specifier))).toBe(true);
    expect([...adminFiles.keys()].map(relative)).toContain("src/lib/db/prisma.ts");
  });
});
