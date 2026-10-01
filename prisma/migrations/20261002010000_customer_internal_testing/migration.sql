ALTER TABLE "customers" ADD COLUMN "internal_test_expires_at" TIMESTAMPTZ(6);
ALTER TABLE "customer_pending_registrations" ADD COLUMN "internal_test_expires_at" TIMESTAMPTZ(6);
CREATE INDEX "customers_internal_test_expires_at_idx" ON "customers"("internal_test_expires_at");
CREATE INDEX "customer_pending_registrations_internal_test_expires_at_idx" ON "customer_pending_registrations"("internal_test_expires_at");
CREATE TABLE "customer_internal_google_consents" (
  "token_hash" TEXT NOT NULL PRIMARY KEY,
  "normalized_email" TEXT NOT NULL,
  "terms_version" TEXT NOT NULL,
  "privacy_version" TEXT NOT NULL,
  "accepted_at" TIMESTAMPTZ(6) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "consumed_at" TIMESTAMPTZ(6)
);
CREATE INDEX "customer_internal_google_consents_expires_at_idx" ON "customer_internal_google_consents"("expires_at");
