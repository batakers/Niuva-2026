-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "account_closed_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "b2b_inquiries" ADD COLUMN     "account_closed_at" TIMESTAMPTZ(6);

-- AlterTable
ALTER TABLE "custom_print_requests" ADD COLUMN     "account_closed_at" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "customer_privacy_requests" (
    "id" UUID NOT NULL,
    "reference_number" TEXT NOT NULL,
    "submission_key" TEXT NOT NULL,
    "customer_id" UUID,
    "kind" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "details" TEXT,
    "correction" TEXT,
    "contact_email" TEXT,
    "response" TEXT,
    "outcome" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_at" TIMESTAMPTZ(6) NOT NULL,
    "resolved_at" TIMESTAMPTZ(6),
    "content_delete_at" TIMESTAMPTZ(6),
    "receipt_delete_at" TIMESTAMPTZ(6),
    "content_purged_at" TIMESTAMPTZ(6),
    "handled_by" UUID,
    "hold_category" TEXT,
    "hold_reason" TEXT,
    "hold_owner_id" UUID,
    "hold_review_at" TIMESTAMPTZ(6),

    CONSTRAINT "customer_privacy_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_privacy_confirmations" (
    "id" UUID NOT NULL,
    "customer_id" UUID,
    "session_hash" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "delivered" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),

    CONSTRAINT "customer_privacy_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_closure_fences" (
    "identity_hash" TEXT NOT NULL,
    "closed_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_closure_fences_pkey" PRIMARY KEY ("identity_hash")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_privacy_requests_reference_number_key" ON "customer_privacy_requests"("reference_number");

-- CreateIndex
CREATE UNIQUE INDEX "customer_privacy_requests_submission_key_key" ON "customer_privacy_requests"("submission_key");

-- CreateIndex
CREATE INDEX "customer_privacy_requests_customer_id_created_at_idx" ON "customer_privacy_requests"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "customer_privacy_requests_status_due_at_idx" ON "customer_privacy_requests"("status", "due_at");

-- CreateIndex
CREATE INDEX "customer_privacy_requests_content_delete_at_receipt_delete__idx" ON "customer_privacy_requests"("content_delete_at", "receipt_delete_at");

-- CreateIndex
CREATE UNIQUE INDEX "customer_privacy_confirmations_token_hash_key" ON "customer_privacy_confirmations"("token_hash");

-- CreateIndex
CREATE INDEX "customer_privacy_confirmations_expires_at_idx" ON "customer_privacy_confirmations"("expires_at");

-- CreateIndex
CREATE INDEX "customer_closure_fences_expires_at_idx" ON "customer_closure_fences"("expires_at");

-- AddForeignKey
ALTER TABLE "customer_privacy_requests" ADD CONSTRAINT "customer_privacy_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_privacy_confirmations" ADD CONSTRAINT "customer_privacy_confirmations_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
