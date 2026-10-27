// @vitest-environment node
/**
 * The proxy only checks that an Admin session cookie is present. Session,
 * second factor and active profile are verified by requireAdmin(), so every
 * Admin page and API route must call it (directly or through the listed
 * delegate). Server Actions are covered by server-actions-authorization.test.ts.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = process.cwd();
const GUARD_CALL = /\b(?:requireAdmin|loadAdminPageAccess)\(/;
// Public by design: the sign-in page and Better Auth / invitation endpoints.
const PUBLIC_ENTRIES = new Set([
  "src/app/admin/sign-in/[[...sign-in]]/page.tsx",
  "src/app/api/admin/auth/[...all]/route.ts",
  "src/app/api/admin/auth/accept-invitation/route.ts",
]);
// Route file -> module that performs the requireAdmin() call for it.
const DELEGATES: Readonly<Record<string, string>> = {
  "src/app/api/admin/privacy/route.ts": "src/modules/customer-privacy/handler.ts",
};

function listEntries(directory: string, fileName: string): string[] {
  const result: string[] = [];

  for (const entry of readdirSync(directory)) {
    const full = path.join(directory, entry);
    if (statSync(full).isDirectory()) result.push(...listEntries(full, fileName));
    else if (entry === fileName) result.push(path.relative(ROOT, full).split(path.sep).join("/"));
  }

  return result;
}

const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");
const entries = [
  ...listEntries(path.join(ROOT, "src", "app", "admin"), "page.tsx"),
  ...listEntries(path.join(ROOT, "src", "app", "api", "admin"), "route.ts"),
].sort();

describe("Admin route guards behind the cookie-only proxy", () => {
  it("finds the Admin surface", () => {
    expect(entries.length).toBeGreaterThan(20);
  });

  it("calls requireAdmin() in every non-public Admin page and API route", () => {
    const unguarded = entries.filter((file) => {
      if (PUBLIC_ENTRIES.has(file)) return false;
      const delegate = DELEGATES[file];
      return !GUARD_CALL.test(read(file)) && !(delegate !== undefined && GUARD_CALL.test(read(delegate)));
    });

    expect(unguarded).toEqual([]);
  });

  it("keeps the public and delegate lists pointing at existing files", () => {
    for (const file of [...PUBLIC_ENTRIES, ...Object.keys(DELEGATES)]) expect(entries, file).toContain(file);
  });
});
