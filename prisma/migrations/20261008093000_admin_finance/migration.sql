-- CreateEnum
CREATE TYPE "StoredFilePurpose" AS ENUM ('CUSTOMER_UPLOAD', 'FINANCIAL_EVIDENCE');

-- CreateEnum
CREATE TYPE "BillingSourceKind" AS ENUM ('ORDER_TOTAL', 'CUSTOM_SHIPPING', 'B2B');

-- CreateEnum
CREATE TYPE "BillingMode" AS ENUM ('FULL', 'DEPOSIT_BALANCE');

-- CreateEnum
CREATE TYPE "InvoiceState" AS ENUM ('DRAFT', 'ISSUED', 'VOID', 'SUPERSEDED');

-- AlterTable
ALTER TABLE "stored_files" ADD COLUMN     "purpose" "StoredFilePurpose" NOT NULL DEFAULT 'CUSTOMER_UPLOAD',
ADD COLUMN     "uploaded_by_admin_id" UUID;

-- CreateTable
CREATE TABLE "billing_cases" (
    "id" UUID NOT NULL,
    "source_key" TEXT NOT NULL,
    "kind" "BillingSourceKind" NOT NULL,
    "order_id" UUID,
    "inquiry_id" UUID,
    "customer_id" UUID,
    "account_closed_at" TIMESTAMPTZ(6),
    "accepted_quote_id" UUID,
    "source_version" TEXT NOT NULL DEFAULT '',
    "version" INTEGER NOT NULL DEFAULT 1,
    "total_rp" DECIMAL(18,0) NOT NULL,
    "mode" "BillingMode" NOT NULL DEFAULT 'FULL',
    "deposit_rp" DECIMAL(18,0),
    "deposit_due_at" DATE,
    "balance_due_at" DATE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "billing_cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "billing_case_id" UUID NOT NULL,
    "revision" INTEGER NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "state" "InvoiceState" NOT NULL DEFAULT 'DRAFT',
    "number" TEXT,
    "document_json" JSONB,
    "buyer_json" JSONB,
    "source_version" TEXT NOT NULL DEFAULT '',
    "idempotency_key" TEXT NOT NULL,
    "issue_key" TEXT,
    "reason" TEXT,
    "replaces_id" UUID,
    "created_by_admin_id" UUID NOT NULL,
    "issued_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoice_sequences" (
    "month" TEXT NOT NULL,
    "counter" INTEGER NOT NULL,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("month")
);

-- CreateTable
CREATE TABLE "manual_b2b_payment_entries" (
    "id" UUID NOT NULL,
    "billing_case_id" UUID NOT NULL,
    "billing_kind" "BillingSourceKind" NOT NULL DEFAULT 'B2B',
    "amount_rp" DECIMAL(18,0) NOT NULL,
    "received_at" DATE NOT NULL,
    "reference" TEXT NOT NULL,
    "note" TEXT,
    "reason" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "reversal_of_id" UUID,
    "corrected_from_id" UUID,
    "created_by_admin_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "manual_b2b_payment_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_entries" (
    "id" UUID NOT NULL,
    "amount_rp" DECIMAL(18,0) NOT NULL,
    "expense_date" DATE NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "proof_file_id" UUID,
    "reason" TEXT,
    "idempotency_key" TEXT NOT NULL,
    "reversal_of_id" UUID,
    "corrected_from_id" UUID,
    "created_by_admin_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_instructions" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'DEFAULT',
    "version" INTEGER NOT NULL,
    "values_json" JSONB NOT NULL,
    "updated_by_admin_id" UUID NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "billing_instructions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "billing_instructions_revisions" (
    "id" UUID NOT NULL,
    "instructions_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "values_json" JSONB NOT NULL,
    "actor_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "billing_instructions_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "billing_cases_source_key_key" ON "billing_cases"("source_key");

-- CreateIndex
CREATE INDEX "billing_cases_customer_id_created_at_idx" ON "billing_cases"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "billing_cases_order_id_idx" ON "billing_cases"("order_id");

-- CreateIndex
CREATE INDEX "billing_cases_inquiry_id_idx" ON "billing_cases"("inquiry_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_cases_id_kind_key" ON "billing_cases"("id", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_idempotency_key_key" ON "invoices"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_issue_key_key" ON "invoices"("issue_key");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_replaces_id_key" ON "invoices"("replaces_id");

-- CreateIndex
CREATE INDEX "invoices_state_created_at_idx" ON "invoices"("state", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_billing_case_id_revision_key" ON "invoices"("billing_case_id", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "manual_b2b_payment_entries_idempotency_key_key" ON "manual_b2b_payment_entries"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "manual_b2b_payment_entries_reversal_of_id_key" ON "manual_b2b_payment_entries"("reversal_of_id");

-- CreateIndex
CREATE UNIQUE INDEX "manual_b2b_payment_entries_corrected_from_id_key" ON "manual_b2b_payment_entries"("corrected_from_id");

-- CreateIndex
CREATE INDEX "manual_b2b_payment_entries_billing_case_id_received_at_idx" ON "manual_b2b_payment_entries"("billing_case_id", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "expense_entries_idempotency_key_key" ON "expense_entries"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "expense_entries_reversal_of_id_key" ON "expense_entries"("reversal_of_id");

-- CreateIndex
CREATE UNIQUE INDEX "expense_entries_corrected_from_id_key" ON "expense_entries"("corrected_from_id");

-- CreateIndex
CREATE INDEX "expense_entries_expense_date_created_at_idx" ON "expense_entries"("expense_date", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "billing_instructions_scope_key" ON "billing_instructions"("scope");

-- CreateIndex
CREATE UNIQUE INDEX "billing_instructions_revisions_instructions_id_version_key" ON "billing_instructions_revisions"("instructions_id", "version");

-- AddForeignKey
ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_uploaded_by_admin_id_fkey" FOREIGN KEY ("uploaded_by_admin_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_cases" ADD CONSTRAINT "billing_cases_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_cases" ADD CONSTRAINT "billing_cases_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "b2b_inquiries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_cases" ADD CONSTRAINT "billing_cases_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_cases" ADD CONSTRAINT "billing_cases_accepted_quote_id_fkey" FOREIGN KEY ("accepted_quote_id") REFERENCES "b2b_quotes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_billing_case_id_fkey" FOREIGN KEY ("billing_case_id") REFERENCES "billing_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_replaces_id_fkey" FOREIGN KEY ("replaces_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_b2b_payment_entries" ADD CONSTRAINT "manual_b2b_payment_entries_billing_case_id_billing_kind_fkey" FOREIGN KEY ("billing_case_id", "billing_kind") REFERENCES "billing_cases"("id", "kind") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_b2b_payment_entries" ADD CONSTRAINT "manual_b2b_payment_entries_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "manual_b2b_payment_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_b2b_payment_entries" ADD CONSTRAINT "manual_b2b_payment_entries_corrected_from_id_fkey" FOREIGN KEY ("corrected_from_id") REFERENCES "manual_b2b_payment_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manual_b2b_payment_entries" ADD CONSTRAINT "manual_b2b_payment_entries_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_entries" ADD CONSTRAINT "expense_entries_proof_file_id_fkey" FOREIGN KEY ("proof_file_id") REFERENCES "stored_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_entries" ADD CONSTRAINT "expense_entries_reversal_of_id_fkey" FOREIGN KEY ("reversal_of_id") REFERENCES "expense_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_entries" ADD CONSTRAINT "expense_entries_corrected_from_id_fkey" FOREIGN KEY ("corrected_from_id") REFERENCES "expense_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_entries" ADD CONSTRAINT "expense_entries_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_instructions" ADD CONSTRAINT "billing_instructions_updated_by_admin_id_fkey" FOREIGN KEY ("updated_by_admin_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_instructions_revisions" ADD CONSTRAINT "billing_instructions_revisions_instructions_id_fkey" FOREIGN KEY ("instructions_id") REFERENCES "billing_instructions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "billing_instructions_revisions" ADD CONSTRAINT "billing_instructions_revisions_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Business invariants also apply to callers outside the UI.
ALTER TABLE billing_cases ADD CONSTRAINT billing_case_source_check CHECK (
  (kind = 'B2B' AND inquiry_id IS NOT NULL AND order_id IS NULL AND accepted_quote_id IS NOT NULL AND source_key = 'B2B:' || inquiry_id::text)
  OR (kind IN ('ORDER_TOTAL', 'CUSTOM_SHIPPING') AND order_id IS NOT NULL AND inquiry_id IS NULL AND accepted_quote_id IS NULL AND source_key = kind::text || ':' || order_id::text)
);
ALTER TABLE billing_cases ADD CONSTRAINT billing_case_money_check CHECK (
  total_rp >= 0 AND version > 0 AND
  ((mode = 'FULL' AND deposit_rp IS NULL) OR (kind = 'B2B' AND mode = 'DEPOSIT_BALANCE' AND deposit_rp > 0 AND deposit_rp < total_rp))
);
ALTER TABLE invoices ADD CONSTRAINT invoice_revision_check CHECK (revision > 0 AND version > 0 AND (replaces_id IS NULL OR replaces_id <> id));
ALTER TABLE invoices ADD CONSTRAINT invoice_issue_check CHECK (state NOT IN ('ISSUED','SUPERSEDED') OR (number IS NOT NULL AND document_json IS NOT NULL AND issued_at IS NOT NULL));
CREATE UNIQUE INDEX invoice_one_active_case ON invoices(billing_case_id) WHERE state IN ('DRAFT','ISSUED');
ALTER TABLE invoice_sequences ADD CONSTRAINT invoice_sequence_check CHECK (counter > 0 AND month ~ '^[0-9]{6}$');
ALTER TABLE manual_b2b_payment_entries ADD CONSTRAINT manual_payment_money_check CHECK (amount_rp > 0 AND billing_kind = 'B2B');
ALTER TABLE manual_b2b_payment_entries ADD CONSTRAINT manual_payment_reversal_check CHECK (reversal_of_id IS NULL OR (reversal_of_id <> id AND reason IS NOT NULL AND corrected_from_id IS NULL));
CREATE UNIQUE INDEX manual_payment_id_case ON manual_b2b_payment_entries(id,billing_case_id);
ALTER TABLE manual_b2b_payment_entries ADD CONSTRAINT manual_reversal_same_case FOREIGN KEY (reversal_of_id,billing_case_id) REFERENCES manual_b2b_payment_entries(id,billing_case_id) ON DELETE RESTRICT;
ALTER TABLE manual_b2b_payment_entries ADD CONSTRAINT manual_correction_same_case FOREIGN KEY (corrected_from_id,billing_case_id) REFERENCES manual_b2b_payment_entries(id,billing_case_id) ON DELETE RESTRICT;
ALTER TABLE expense_entries ADD CONSTRAINT expense_money_check CHECK (amount_rp > 0);
ALTER TABLE expense_entries ADD CONSTRAINT expense_reversal_check CHECK (reversal_of_id IS NULL OR (reversal_of_id <> id AND reason IS NOT NULL AND corrected_from_id IS NULL));
ALTER TABLE stored_files ADD CONSTRAINT financial_evidence_private_check CHECK (purpose <> 'FINANCIAL_EVIDENCE' OR (bucket_scope = 'PRIVATE_CUSTOMER' AND uploaded_by_admin_id IS NOT NULL AND uploaded_by_customer_id IS NULL));

-- Issued totals/instructions are immutable; buyer_json has a separate privacy
-- redaction path. State and linked corrections can change without rewriting it.
CREATE FUNCTION protect_issued_invoice_snapshot() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.number IS NOT NULL AND (NEW.document_json IS DISTINCT FROM OLD.document_json OR NEW.number IS DISTINCT FROM OLD.number OR NEW.issued_at IS DISTINCT FROM OLD.issued_at OR NEW.billing_case_id IS DISTINCT FROM OLD.billing_case_id OR NEW.revision IS DISTINCT FROM OLD.revision) THEN
    RAISE EXCEPTION 'Issued invoice snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER issued_invoice_snapshot_immutable BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION protect_issued_invoice_snapshot();
