import { readFile, readdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { expect, it } from "vitest";

type MigrationClient = Readonly<{
  connect(): Promise<void>;
  end(): Promise<void>;
  query<T = unknown>(sql: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
}>;

const { Client } = createRequire(import.meta.url)("pg") as {
  Client: new (config: { connectionString?: string }) => MigrationClient;
};

it("opens a dated ledger at the existing balances without inventing prior transactions", async () => {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  const migrationRoot = resolve(process.cwd(), "prisma/migrations");
  const names = (await readdir(migrationRoot))
    .filter((name) => /^\d/.test(name))
    .sort();
  const ledgerName = "20260927_stock_movement_ledger";
  const schema = `stock_probe_${crypto.randomUUID().replaceAll("-", "")}`;

  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`SET LOCAL search_path TO "${schema}"`);
    for (const name of names.filter((name) => name !== ledgerName)) {
      const sql = await readFile(resolve(migrationRoot, name, "migration.sql"), "utf8");
      await client.query(sql);
    }
    const productId = crypto.randomUUID();
    const stockedId = crypto.randomUUID();
    const emptyId = crypto.randomUUID();
    await client.query(`INSERT INTO "products" ("id", "slug", "name", "description", "updated_at") VALUES ($1, 'ledger-probe', 'Ledger probe', 'Migration fixture', CURRENT_TIMESTAMP)`, [productId]);
    await client.query(`
      INSERT INTO "product_variants" ("id", "product_id", "sku", "name", "price_rp", "stock_on_hand", "weight_grams", "updated_at")
      VALUES ($1, $3, 'LEDGER-PROBE-STOCK', 'Stocked', 10000, 7, 10, CURRENT_TIMESTAMP),
             ($2, $3, 'LEDGER-PROBE-ZERO', 'Empty', 10000, 0, 10, CURRENT_TIMESTAMP)
    `, [stockedId, emptyId, productId]);
    await client.query(await readFile(resolve(migrationRoot, ledgerName, "migration.sql"), "utf8"));
    const result = await client.query<{
      balance_after: number;
      balance_before: number;
      delta: number;
      kind: string;
      variant_id: string;
    }>(`SELECT "variant_id", "kind", "delta", "balance_before", "balance_after" FROM "stock_movements" ORDER BY "balance_after" DESC`);
    expect(result.rows).toEqual([
      { variant_id: stockedId, kind: "OPENING_BALANCE", delta: 7, balance_before: 0, balance_after: 7 },
      { variant_id: emptyId, kind: "OPENING_BALANCE", delta: 0, balance_before: 0, balance_after: 0 },
    ]);
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});
