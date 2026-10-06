-- Nullable columns preserve existing accounts and pending legacy records.
-- New registration services record an explicit server-timestamped declaration.
ALTER TABLE "customer_pending_registrations"
  ADD COLUMN "age_declaration_version" TEXT,
  ADD COLUMN "age_declared_at" TIMESTAMPTZ(6);

ALTER TABLE "customer_consents"
  ADD COLUMN "age_declaration_version" TEXT,
  ADD COLUMN "age_declared_at" TIMESTAMPTZ(6);

ALTER TABLE "customer_internal_google_consents"
  ADD COLUMN "age_declaration_version" TEXT,
  ADD COLUMN "age_declared_at" TIMESTAMPTZ(6);
