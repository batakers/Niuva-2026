CREATE TABLE "payment_reconciliation_checks" (
  "id" UUID NOT NULL,
  "run_id" UUID NOT NULL,
  "payment_attempt_id" UUID NOT NULL,
  "checked_at" TIMESTAMPTZ(6) NOT NULL,
  "outcome" TEXT NOT NULL,
  "failure_category" TEXT,
  "event_fingerprint" CHAR(64),
  CONSTRAINT "payment_reconciliation_checks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_reconciliation_attempt_fkey" FOREIGN KEY ("payment_attempt_id") REFERENCES "payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "payment_reconciliation_outcome_check" CHECK (outcome ~ '^[A-Z_]{1,64}$'),
  CONSTRAINT "payment_reconciliation_failure_check" CHECK (failure_category IS NULL OR failure_category IN ('TIMEOUT', 'RATE_LIMITED', 'PROVIDER_ERROR', 'INVALID_RESPONSE', 'IDENTITY_MISMATCH')),
  CONSTRAINT "payment_reconciliation_fingerprint_check" CHECK (event_fingerprint IS NULL OR event_fingerprint ~ '^[a-f0-9]{64}$')
);
CREATE UNIQUE INDEX "payment_reconciliation_checks_run_id_payment_attempt_id_key" ON "payment_reconciliation_checks"("run_id", "payment_attempt_id");
CREATE INDEX "payment_reconciliation_checks_payment_attempt_id_checked_at_idx" ON "payment_reconciliation_checks"("payment_attempt_id", "checked_at");

-- CUSTOMER_FILE_RETENTION is the approved sibling T08 job name. Keeping it in
-- this later whitelist preserves that name in the combined release baseline.
ALTER TABLE "operational_job_states" DROP CONSTRAINT "operational_job_name";
ALTER TABLE "operational_job_states" ADD CONSTRAINT "operational_job_name" CHECK (name IN (
  'OUTBOX_DELIVERY', 'OUTBOX_EXPIRY', 'CUSTOMER_AUTH_CLEANUP', 'CUSTOMER_PRIVACY_CLEANUP',
  'INVENTORY_RESERVATIONS', 'CUSTOMER_FILE_RETENTION', 'PAYMENT_RECONCILIATION'
));
