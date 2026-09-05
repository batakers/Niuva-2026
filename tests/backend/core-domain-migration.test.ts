import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vitest";

const migrationUrl = new URL(
  "../../prisma/migrations/20260904090000_core_domain_persistence/migration.sql",
  import.meta.url,
);

describe("core domain migration contract", () => {
  it("contains unique, snapshot, and deferred ownership safeguards", async () => {
    const migration = await readFile(migrationUrl, "utf8");

    expect(migration).toContain(
      'CREATE UNIQUE INDEX "idempotency_records_scope_idempotency_key_key"',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "payment_events_event_fingerprint_key"',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "product_variants_sku_key"',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "b2b_inquiries_reference_number_key"',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "b2b_inquiries_public_token_hash_key"',
    );
    expect(migration).toContain(
      'CREATE TABLE "custom_print_reviews"',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "custom_print_reviews_request_id_key"',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "custom_print_quotes_public_token_hash_key"',
    );
    expect(migration).toContain(
      'CREATE UNIQUE INDEX "payment_attempts_provider_order_id_key"',
    );
    expect(migration).toContain('"expires_at" TIMESTAMPTZ(6) NOT NULL');
    expect(migration).toContain(
      'CREATE INDEX "payment_attempts_status_expires_at_idx"',
    );
    expect(migration).toContain('"orders_commercial_snapshot_immutable"');
    expect(migration).toContain('"custom_print_quotes_sent_snapshot_immutable"');
    expect(migration).toContain('"stored_file_verified_owner_check"');
    expect(migration).toContain('"b2b_inquiry_reference_check"');
    expect(migration).toContain(
      'target_inquiry_ids := ARRAY[OLD."inquiry_id", NEW."inquiry_id"];',
    );
    expect(migration).toContain(
      'target_file_ids := ARRAY[OLD."file_id", NEW."file_id"];',
    );
  });
});
