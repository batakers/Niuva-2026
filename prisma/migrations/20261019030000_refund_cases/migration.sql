CREATE TYPE "RefundCaseStatus" AS ENUM ('REQUESTED', 'APPROVED', 'RECONCILING', 'COMPLETED');

CREATE TABLE "refund_cases" (
  "id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "status" "RefundCaseStatus" NOT NULL DEFAULT 'REQUESTED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "category" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "requester_type" TEXT NOT NULL,
  "requested_by_customer_id" UUID,
  "requested_by_admin_id" UUID,
  "contact_verification_reference" TEXT,
  "submission_key" UUID NOT NULL,
  "request_hash" CHAR(64) NOT NULL,
  "currency" CHAR(3) NOT NULL DEFAULT 'IDR',
  "amount_rp" DECIMAL(18,0) NOT NULL,
  "snapshot_hash" CHAR(64) NOT NULL,
  "approved_version" INTEGER,
  "ready_at" TIMESTAMPTZ(6),
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL,
  CONSTRAINT "refund_cases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "refund_cases_money_check" CHECK (currency = 'IDR' AND amount_rp > 0),
  CONSTRAINT "refund_cases_request_check" CHECK (
    version > 0 AND length(btrim(reason)) BETWEEN 10 AND 1000
    AND category IN ('DELIVERY_DELAY', 'ITEM_ISSUE', 'OTHER')
    AND request_hash ~ '^[a-f0-9]{64}$' AND snapshot_hash ~ '^[a-f0-9]{64}$'
    AND ((requester_type = 'CUSTOMER' AND requested_by_admin_id IS NULL AND contact_verification_reference IS NULL)
      OR (requester_type = 'ADMIN' AND requested_by_admin_id IS NOT NULL AND requested_by_customer_id IS NULL AND contact_verification_reference IS NOT NULL AND length(btrim(contact_verification_reference)) BETWEEN 5 AND 200))
  ),
  CONSTRAINT "refund_cases_approval_check" CHECK (
    (status = 'REQUESTED' AND approved_version IS NULL AND ready_at IS NULL)
    OR (status <> 'REQUESTED' AND approved_version IS NOT NULL AND approved_version > 1 AND approved_version <= version)
  )
);
CREATE UNIQUE INDEX "refund_cases_order_id_key" ON "refund_cases"("order_id");
CREATE UNIQUE INDEX "refund_cases_submission_key_key" ON "refund_cases"("submission_key");
CREATE INDEX "refund_cases_status_received_at_idx" ON "refund_cases"("status", "received_at");
ALTER TABLE "refund_cases" ADD CONSTRAINT "refund_cases_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_cases" ADD CONSTRAINT "refund_cases_requested_by_customer_id_fkey" FOREIGN KEY ("requested_by_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "refund_cases" ADD CONSTRAINT "refund_cases_requested_by_admin_id_fkey" FOREIGN KEY ("requested_by_admin_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "refund_allocations" (
  "id" UUID NOT NULL,
  "case_id" UUID NOT NULL,
  "payment_attempt_id" UUID NOT NULL,
  "purpose" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "provider_order_id" TEXT NOT NULL,
  "provider_transaction_id" TEXT,
  "amount_rp" DECIMAL(18,0) NOT NULL,
  "source" TEXT NOT NULL,
  CONSTRAINT "refund_allocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "refund_allocations_money_check" CHECK (amount_rp > 0 AND source IN ('SETTLED', 'LATE_SETTLEMENT'))
);
CREATE UNIQUE INDEX "refund_allocations_payment_attempt_id_key" ON "refund_allocations"("payment_attempt_id");
CREATE INDEX "refund_allocations_case_id_idx" ON "refund_allocations"("case_id");
ALTER TABLE "refund_allocations" ADD CONSTRAINT "refund_allocations_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "refund_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_allocations" ADD CONSTRAINT "refund_allocations_payment_attempt_id_fkey" FOREIGN KEY ("payment_attempt_id") REFERENCES "payment_attempts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "refund_approvals" (
  "id" UUID NOT NULL,
  "case_id" UUID NOT NULL,
  "case_version" INTEGER NOT NULL,
  "owner_id" UUID NOT NULL,
  "submission_key" UUID NOT NULL,
  "request_hash" CHAR(64) NOT NULL,
  "reason" TEXT NOT NULL,
  "amount_rp" DECIMAL(18,0) NOT NULL,
  "snapshot_hash" CHAR(64) NOT NULL,
  "snapshot_json" JSONB NOT NULL,
  "return_state" TEXT NOT NULL,
  "return_evidence_reference" TEXT,
  "return_satisfied_at" TIMESTAMPTZ(6),
  "approved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refund_approvals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "refund_approvals_snapshot_check" CHECK (
    case_version > 1 AND amount_rp > 0 AND length(btrim(reason)) BETWEEN 10 AND 1000
    AND request_hash ~ '^[a-f0-9]{64}$' AND snapshot_hash ~ '^[a-f0-9]{64}$' AND jsonb_typeof(snapshot_json) = 'object'
    AND ((return_state = 'PENDING' AND return_satisfied_at IS NULL)
      OR (return_state IN ('NOT_REQUIRED', 'RECEIVED', 'WAIVED') AND return_satisfied_at IS NOT NULL))
    AND (return_state <> 'RECEIVED' OR (return_evidence_reference IS NOT NULL AND length(btrim(return_evidence_reference)) BETWEEN 5 AND 200))
  )
);
CREATE UNIQUE INDEX "refund_approvals_submission_key_key" ON "refund_approvals"("submission_key");
CREATE UNIQUE INDEX "refund_approvals_case_id_case_version_key" ON "refund_approvals"("case_id", "case_version");
ALTER TABLE "refund_approvals" ADD CONSTRAINT "refund_approvals_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "refund_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_approvals" ADD CONSTRAINT "refund_approvals_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "refund_return_receipts" (
  "id" UUID NOT NULL,
  "approval_id" UUID NOT NULL,
  "owner_id" UUID NOT NULL,
  "submission_key" UUID NOT NULL,
  "request_hash" CHAR(64) NOT NULL,
  "reason" TEXT NOT NULL,
  "evidence_reference" TEXT NOT NULL,
  "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refund_return_receipts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "refund_return_receipts_evidence_check" CHECK (length(btrim(reason)) BETWEEN 10 AND 1000 AND length(btrim(evidence_reference)) BETWEEN 5 AND 200 AND request_hash ~ '^[a-f0-9]{64}$')
);
CREATE UNIQUE INDEX "refund_return_receipts_approval_id_key" ON "refund_return_receipts"("approval_id");
CREATE UNIQUE INDEX "refund_return_receipts_submission_key_key" ON "refund_return_receipts"("submission_key");
ALTER TABLE "refund_return_receipts" ADD CONSTRAINT "refund_return_receipts_approval_id_fkey" FOREIGN KEY ("approval_id") REFERENCES "refund_approvals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_return_receipts" ADD CONSTRAINT "refund_return_receipts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "refund_case_revisions" (
  "id" UUID NOT NULL,
  "case_id" UUID NOT NULL,
  "case_version" INTEGER NOT NULL,
  "owner_id" UUID NOT NULL,
  "submission_key" UUID NOT NULL,
  "request_hash" CHAR(64) NOT NULL,
  "reason" TEXT NOT NULL,
  "snapshot_json" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refund_case_revisions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "refund_case_revisions_snapshot_check" CHECK (case_version > 1 AND length(btrim(reason)) BETWEEN 10 AND 1000 AND request_hash ~ '^[a-f0-9]{64}$' AND jsonb_typeof(snapshot_json) = 'object')
);
CREATE UNIQUE INDEX "refund_case_revisions_submission_key_key" ON "refund_case_revisions"("submission_key");
CREATE UNIQUE INDEX "refund_case_revisions_case_id_case_version_key" ON "refund_case_revisions"("case_id", "case_version");
ALTER TABLE "refund_case_revisions" ADD CONSTRAINT "refund_case_revisions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "refund_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_case_revisions" ADD CONSTRAINT "refund_case_revisions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
