CREATE TABLE "operational_job_states" (
  "name" TEXT PRIMARY KEY,
  "lease_id" UUID,
  "lease_expires_at" TIMESTAMPTZ(6),
  "cooldown_until" TIMESTAMPTZ(6),
  "last_started_at" TIMESTAMPTZ(6),
  "last_finished_at" TIMESTAMPTZ(6),
  "last_success_at" TIMESTAMPTZ(6),
  "last_failure_category" TEXT,
  "counters" JSONB,
  "run_count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "operational_job_name" CHECK ("name" IN ('OUTBOX_DELIVERY', 'OUTBOX_EXPIRY', 'CUSTOMER_AUTH_CLEANUP', 'CUSTOMER_PRIVACY_CLEANUP')),
  CONSTRAINT "operational_job_lease" CHECK (("lease_id" IS NULL) = ("lease_expires_at" IS NULL)),
  CONSTRAINT "operational_job_runs" CHECK ("run_count" >= 0),
  CONSTRAINT "operational_job_failure" CHECK ("last_failure_category" IS NULL OR "last_failure_category" IN ('JOB_FAILED', 'DELIVERY_FAILED', 'OUTCOME_UNKNOWN', 'LEASE_EXPIRED')),
  CONSTRAINT "operational_job_counters" CHECK ("counters" IS NULL OR jsonb_typeof("counters") = 'object')
);
