import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { createRequire } from "node:module";
import { afterEach, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const nextConfigRequire = createRequire(require.resolve("eslint-config-next"));
const pluginDir = dirname(nextConfigRequire.resolve("@next/eslint-plugin-next"));
const utils: unknown = require(join(pluginDir, "utils/get-root-dirs.js"));
if (typeof utils !== "object" || utils === null || !("getRootDirs" in utils) || typeof utils.getRootDirs !== "function") {
  throw new Error("Next ESLint root directory API is unavailable");
}
const getRootDirs = utils.getRootDirs;
const fixtures: string[] = [];
afterEach(async () => {
  for (const directory of fixtures.splice(0)) await rm(directory, { recursive: true, force: true });
});

it("Next ESLint resolves only directory roots for globs, explicit paths and arrays", async () => {
  const directory = await mkdtemp(join(tmpdir(), "niuva-eslint-roots-"));
  fixtures.push(directory);
  for (const name of ["web/src/pages", "shop/src/app", ".hidden"]) await mkdir(join(directory, "apps", name), { recursive: true });
  await writeFile(join(directory, "apps", "file.txt"), "not an application directory");
  const base = directory.replace(/\\/g, "/");
  function resolveRoots(rootDir?: string | readonly string[]): unknown {
    return getRootDirs({ cwd: directory, settings: rootDir ? { next: { rootDir } } : {} });
  }
  expect(resolveRoots()).toEqual([directory]);
  expect(resolveRoots(`${base}/apps/*`)).toEqual(expect.arrayContaining([`${base}/apps/web`, `${base}/apps/shop`]));
  expect(resolveRoots(`${base}/apps/*`)).toHaveLength(2);
  expect(resolveRoots(`${base}/apps/web`)).toEqual([`${base}/apps/web`]);
  expect(resolveRoots([`${base}/apps/web`, `${base}/apps/shop`])).toEqual([`${base}/apps/web`, `${base}/apps/shop`]);
  expect(resolveRoots(`${base}/apps/{web,shop}`)).toEqual(expect.arrayContaining([`${base}/apps/web`, `${base}/apps/shop`]));
  expect(resolveRoots(`${base}/apps/{web,shop}`)).toHaveLength(2);
  expect(resolveRoots(`${base}/apps/missing`)).toEqual([]);
  const relativeBase = relative(process.cwd(), directory).replace(/\\/g, "/");
  expect(resolveRoots(`${relativeBase}/apps/*`)).toEqual(expect.arrayContaining([`${relativeBase}/apps/web`, `${relativeBase}/apps/shop`]));
});
