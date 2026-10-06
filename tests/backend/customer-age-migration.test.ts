import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
const name = "20261005230000_customer_age_declaration";
describe("Customer age migration is additive and legacy-safe", () => {
  it("adds only nullable declaration columns to the three auth records without backfilling consent", async () => {
    expect(name).toMatch(/^\d{14}_[a-z0-9_]+$/);
    const sql = await readFile(new URL(`../../prisma/migrations/${name}/migration.sql`, import.meta.url), "utf8");
    const statements = sql.split("\n").filter(line => !line.trim().startsWith("--")).join("\n").split(";").map(value => value.trim()).filter(Boolean);
    expect(statements).toHaveLength(3);
    expect(statements.map(statement => statement.match(/^ALTER TABLE "([a-z_]+)"/)?.[1])).toEqual(["customer_pending_registrations", "customer_consents", "customer_internal_google_consents"]);
    for (const statement of statements) {
      expect(statement).toContain('ADD COLUMN "age_declaration_version" TEXT');
      expect(statement).toContain('ADD COLUMN "age_declared_at" TIMESTAMPTZ(6)');
      expect(statement).not.toMatch(/\b(DROP|DELETE|TRUNCATE|UPDATE|INSERT|DEFAULT)\b|NOT NULL/i);
    }
  });
});
