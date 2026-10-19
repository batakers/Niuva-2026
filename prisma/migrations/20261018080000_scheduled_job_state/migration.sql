CREATE TABLE "scheduled_job_states" (
  "job_key" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'IDLE',
  "lease_id" UUID,
  "lease_expires_at" TIMESTAMPTZ(6),
  "cooldown_until" TIMESTAMPTZ(6),
  "last_started_at" TIMESTAMPTZ(6),
  "last_finished_at" TIMESTAMPTZ(6),
  "last_success_at" TIMESTAMPTZ(6),
  "last_failure_at" TIMESTAMPTZ(6),
  "last_error_category" TEXT,
  "last_summary" JSONB,
  "last_lag_ms" INTEGER,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "scheduled_job_states_pkey" PRIMARY KEY ("job_key"),
  CONSTRAINT "scheduled_job_states_key_check" CHECK ("job_key" IN ('customer-outbox', 'inventory-reservations', 'customer-file-retention', 'customer-privacy-cleanup')),
  CONSTRAINT "scheduled_job_states_status_check" CHECK ("status" IN ('IDLE', 'RUNNING', 'SUCCEEDED', 'PARTIAL_FAILURE', 'FAILED')),
  CONSTRAINT "scheduled_job_states_lease_check" CHECK (("status" = 'RUNNING' AND "lease_id" IS NOT NULL AND "lease_expires_at" IS NOT NULL) OR ("status" <> 'RUNNING' AND "lease_id" IS NULL AND "lease_expires_at" IS NULL)),
  CONSTRAINT "scheduled_job_states_lag_check" CHECK ("last_lag_ms" IS NULL OR "last_lag_ms" >= 0),
  CONSTRAINT "scheduled_job_states_error_check" CHECK ("last_error_category" IS NULL OR "last_error_category" IN ('VALIDATION_ERROR', 'PROVIDER_UNAVAILABLE', 'RESOURCE_BUSY', 'UNKNOWN'))
);
CREATE INDEX "scheduled_job_states_status_lease_expires_at_idx" ON "scheduled_job_states"("status", "lease_expires_at");
