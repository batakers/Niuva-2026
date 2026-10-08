CREATE TABLE "admin_notification_states" (
  "profile_id" UUID NOT NULL,
  "activated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "admin_notification_states_pkey" PRIMARY KEY ("profile_id")
);
CREATE TABLE "admin_notification_receipts" (
  "profile_id" UUID NOT NULL,
  "audit_log_id" UUID NOT NULL,
  "read_at" TIMESTAMPTZ(6),
  "toast_claimed_at" TIMESTAMPTZ(6),
  CONSTRAINT "admin_notification_receipts_pkey" PRIMARY KEY ("profile_id", "audit_log_id")
);
CREATE INDEX "audit_logs_created_at_id_idx" ON "audit_logs"("created_at", "id");
CREATE INDEX "admin_notification_receipts_profile_id_read_at_idx" ON "admin_notification_receipts"("profile_id", "read_at");
CREATE INDEX "admin_notification_receipts_audit_log_id_idx" ON "admin_notification_receipts"("audit_log_id");
ALTER TABLE "admin_notification_states" ADD CONSTRAINT "admin_notification_states_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "admin_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_notification_receipts" ADD CONSTRAINT "admin_notification_receipts_profile_id_fkey" FOREIGN KEY ("profile_id") REFERENCES "admin_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "admin_notification_receipts" ADD CONSTRAINT "admin_notification_receipts_audit_log_id_fkey" FOREIGN KEY ("audit_log_id") REFERENCES "audit_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
