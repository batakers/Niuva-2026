ALTER TYPE "StoredFileStatus" ADD VALUE 'DELETE_PENDING';

ALTER TABLE "stored_files"
  ADD COLUMN "retention_class" TEXT,
  ADD COLUMN "retention_eligible_at" TIMESTAMPTZ(6),
  ADD COLUMN "retention_started_at" TIMESTAMPTZ(6),
  ADD COLUMN "retention_attempts" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "retention_last_failure" TEXT,
  ADD COLUMN "retention_privacy_hold_case_ids" UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],
  ADD COLUMN "retention_hold_reason" TEXT,
  ADD COLUMN "retention_hold_review_at" TIMESTAMPTZ(6),
  ADD COLUMN "retention_hold_owner_id" UUID REFERENCES "admin_profiles"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "stored_files_retention_snapshot_check" CHECK (
    (retention_started_at IS NULL AND retention_class IS NULL AND retention_eligible_at IS NULL AND upload_status::text <> 'DELETE_PENDING')
    OR (retention_started_at IS NOT NULL AND retention_class IS NOT NULL AND retention_eligible_at IS NOT NULL
      AND retention_class IN ('ABANDONED_OR_REJECTED_UPLOAD', 'CANCELLED_OR_UNPAID_REQUEST', 'COMPLETED_CUSTOM_ORDER')
      AND purpose::text = 'CUSTOMER_UPLOAD' AND bucket_scope::text = 'PRIVATE_CUSTOMER'
      AND upload_status::text IN ('DELETE_PENDING', 'DELETED'))
  ),
  ADD CONSTRAINT "stored_files_retention_attempts_check" CHECK (retention_attempts >= 0),
  ADD CONSTRAINT "stored_files_retention_failure_check" CHECK (retention_last_failure IS NULL OR retention_last_failure IN ('STORAGE_DELETE_FAILED', 'STORAGE_OUTCOME_UNKNOWN')),
  ADD CONSTRAINT "stored_files_retention_hold_check" CHECK (
    (retention_hold_reason IS NULL AND retention_hold_review_at IS NULL AND retention_hold_owner_id IS NULL)
    OR (retention_hold_reason IS NOT NULL AND length(btrim(retention_hold_reason)) BETWEEN 10 AND 1000 AND retention_hold_review_at IS NOT NULL AND retention_hold_owner_id IS NOT NULL)
  );
CREATE INDEX "stored_files_created_at_id_idx" ON "stored_files"("created_at", "id");
CREATE INDEX "stored_files_upload_status_retention_started_at_idx" ON "stored_files"("upload_status", "retention_started_at");

ALTER TABLE "operational_job_states"
  DROP CONSTRAINT "operational_job_name",
  ADD CONSTRAINT "operational_job_name" CHECK (name IN ('OUTBOX_DELIVERY', 'OUTBOX_EXPIRY', 'CUSTOMER_AUTH_CLEANUP', 'CUSTOMER_PRIVACY_CLEANUP', 'INVENTORY_RESERVATIONS', 'CUSTOMER_FILE_RETENTION')),
  ADD COLUMN "file_retention_cursor_id" UUID,
  ADD CONSTRAINT "operational_job_states_file_cursor_check" CHECK (
    file_retention_cursor_id IS NULL OR name = 'CUSTOMER_FILE_RETENTION'
  );
