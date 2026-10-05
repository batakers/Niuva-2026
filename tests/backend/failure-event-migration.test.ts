import { readFile, readdir } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const migrationsUrl = new URL("../../prisma/migrations/", import.meta.url);
const migrationName = "20261003120000_failure_events";

async function readMigration(): Promise<string> {
  return readFile(
    new URL(`${migrationName}/migration.sql`, migrationsUrl),
    "utf8",
  );
}

function statements(sql: string): string[] {
  return sql
    .split("\n")
    .filter((line) => !line.trim().startsWith("--"))
    .join("\n")
    .split(";")
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
}

describe("failure_events migration contract", () => {
  it("sorts after every earlier migration and uses the full 14-digit timestamp", async () => {
    const names = (await readdir(migrationsUrl, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);

    expect(migrationName).toMatch(/^\d{14}_[a-z0-9_]+$/);
    // The approved additive age migration now follows this historical one.
    expect([...names].sort().at(-2)).toBe(migrationName);
    expect([...names].sort().at(-1)).toBe("20261005230000_customer_age_declaration");
  });

  it("only creates the table and its two indexes", async () => {
    const parsed = statements(await readMigration());

    expect(parsed).toHaveLength(3);
    expect(parsed[0]).toMatch(/^CREATE TABLE "failure_events"/);
    expect(parsed.slice(1).every((s) => /^CREATE INDEX /.test(s))).toBe(true);
    expect(parsed.join("\n")).not.toMatch(
      /\b(DROP|ALTER|TRUNCATE|DELETE|UPDATE|INSERT|REFERENCES|FOREIGN KEY|TRIGGER|FUNCTION)\b/i,
    );
  });

  it("declares the two requested indexes", async () => {
    const migration = await readMigration();

    expect(migration).toContain(
      'CREATE INDEX "failure_events_correlation_id_idx" ON "failure_events"("correlation_id")',
    );
    expect(migration).toContain(
      'CREATE INDEX "failure_events_occurred_at_idx" ON "failure_events"("occurred_at")',
    );
  });

  it("has no payload, header, body, token, email, name, or PII columns", async () => {
    const migration = await readMigration();
    const columns = [...migration.matchAll(/^\s+"([a-z_]+)" [A-Z]/gm)].map(
      (match) => match[1],
    );

    expect(columns).toEqual([
      "id",
      "correlation_id",
      "boundary",
      "error_code",
      "kind",
      "occurred_at",
      "safe_context_json",
    ]);
    for (const column of columns) {
      expect(column).not.toMatch(
        /payload|header|body|token|email|name|phone|address|ip/,
      );
    }
  });
});
