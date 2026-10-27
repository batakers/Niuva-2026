import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("../../", import.meta.url));
const jitiCli = fileURLToPath(new URL("../../node_modules/jiti/lib/jiti-cli.mjs", import.meta.url));
const script = fileURLToPath(new URL("../../scripts/staging-preflight.ts", import.meta.url));

describe("T03 preflight CLI", () => {
  it.each([
    { database: undefined, reason: "CONFIG_INVALID" },
    { database: "postgresql://runtime:private-cli-fixture-sentinel@127.0.0.1:1/niuva_cli_fixture_test?sslmode=verify-full", reason: "DATABASE_UNAVAILABLE" },
  ])("exits safely for $reason through the real TypeScript entrypoint", ({ database, reason }) => {
    const systemKeys = new Set(["systemroot", "windir", "path", "pathext", "comspec", "temp", "tmp", "userprofile", "appdata", "localappdata"]);
    const env: NodeJS.ProcessEnv = {
      ...Object.fromEntries(Object.entries(process.env).filter(([key]) => systemKeys.has(key.toLowerCase()))),
      NODE_ENV: "production",
    };
    Object.assign(env, {
      NIUVA_DEPLOYMENT_TIER: "staging",
      NIUVA_PROVIDER_MODE: "sandbox",
      APP_URL: "https://staging.niuva.example.test",
      NIUVA_DATABASE_BINDING_ID: "07000000-0000-4000-8000-000000000003",
    });
    if (database) {
      env.DATABASE_URL = database;
      env.NIUVA_STAGING_MIGRATION_DATABASE_URL = "postgresql://migration:private-cli-fixture-sentinel@127.0.0.1:1/niuva_cli_fixture_test?sslmode=verify-full";
    }
    const result = spawnSync(process.execPath, [jitiCli, script], { cwd: root, env, encoding: "utf8", timeout: 15_000 });

    expect(result.error).toBeUndefined();
    expect(result.status).toBe(1);
    expect(result.stderr).toBe("");
    expect(JSON.parse(result.stdout.trim())).toEqual({ status: "FAILED", reason });
    expect(result.stdout).not.toContain("private-cli-fixture-sentinel");
  }, 20_000);
});
