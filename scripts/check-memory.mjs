import { readFileSync, readdirSync } from "node:fs";

function checkMemory() {
  const root = new URL("../", import.meta.url);
  const memory = readFileSync(new URL("MEMORY.md", root), "utf8");
  const schema = readFileSync(new URL("prisma/schema.prisma", root), "utf8");
  const manifest = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
  const models = [...schema.matchAll(/^model /gm)].length;
  const migrations = readdirSync(new URL("prisma/migrations/", root), {
    withFileTypes: true,
  }).filter((entry) => entry.isDirectory() && entry.name !== "migration_lock.toml").length;
  const errors = [];

  function checkCount(label, pattern, actual, source) {
    const matches = [...memory.matchAll(pattern)];
    if (matches.length === 0) {
      console.warn(`[check:memory] WARNING: MEMORY.md has no ${label} count; ${source} has ${actual}.`);
      return;
    }
    for (const match of matches) {
      if (Number(match[1]) !== actual) {
        const line = memory.slice(0, match.index).split(/\r?\n/).length;
        errors.push(`MEMORY.md:${line} records ${match[1]} ${label}; ${source} has ${actual}.`);
      }
    }
  }

  checkCount("models", /\b(\d+)\s+(?:Prisma\s+)?models?\b/gi, models, "prisma/schema.prisma");
  checkCount("migrations", /\b(\d+)\s+migrations?(?:\s+folders?)?\b/gi, migrations, "prisma/migrations/");

  const clerkRemoved = /\bClerk(?:\s+SDK)?\s+(?:(?:is|was|has been)\s+)?(?:absent|removed|deleted|(?:sudah|telah)\s+dihapus|dihapus)\b/i.test(memory);
  if (clerkRemoved) {
    for (const group of ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"]) {
      for (const name of Object.keys(manifest[group] ?? {})) {
        if (name.startsWith("@clerk/")) {
          errors.push(`MEMORY.md states Clerk is removed, but package.json ${group} contains ${name}.`);
        }
      }
    }
  }

  if (errors.length > 0) {
    for (const error of errors) console.error(`[check:memory] ERROR: ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[check:memory] No mismatches found. Source: ${models} models, ${migrations} migration folders.`);
}

try {
  checkMemory();
} catch (error) {
  console.error(`[check:memory] ERROR: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
