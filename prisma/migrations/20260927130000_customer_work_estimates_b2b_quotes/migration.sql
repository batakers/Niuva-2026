CREATE TYPE "B2BQuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED');

ALTER TABLE "b2b_inquiries" ADD COLUMN "customer_id" UUID;
ALTER TABLE "custom_print_requests"
  ADD COLUMN "customer_id" UUID,
  ADD COLUMN "estimated_package" JSONB;
ALTER TABLE "custom_print_quotes"
  ADD COLUMN "additional_subtotal_rp" DECIMAL(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN "estimate_id" UUID;

CREATE TABLE "custom_print_estimates" (
  "id" UUID NOT NULL,
  "request_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "pricing_rule_version_id" UUID NOT NULL,
  "snapshot" JSONB NOT NULL,
  "baseline_rp" DECIMAL(18,6) NOT NULL,
  "additional_subtotal_rp" DECIMAL(18,6) NOT NULL,
  "lower_rp" DECIMAL(18,0) NOT NULL,
  "upper_rp" DECIMAL(18,0) NOT NULL,
  "published_by_admin_id" UUID NOT NULL,
  "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "custom_print_estimates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "b2b_quotes" (
  "id" UUID NOT NULL,
  "inquiry_id" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "status" "B2BQuoteStatus" NOT NULL DEFAULT 'DRAFT',
  "scope" TEXT NOT NULL,
  "assumptions" TEXT NOT NULL,
  "line_items" JSONB NOT NULL,
  "total_rp" DECIMAL(18,0) NOT NULL,
  "valid_until" TIMESTAMPTZ(6) NOT NULL,
  "created_by_admin_id" UUID NOT NULL,
  "decided_by_customer_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sent_at" TIMESTAMPTZ(6),
  "decided_at" TIMESTAMPTZ(6),
  CONSTRAINT "b2b_quotes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "b2b_inquiries_customer_id_created_at_idx" ON "b2b_inquiries"("customer_id", "created_at");
CREATE INDEX "custom_print_requests_customer_id_created_at_idx" ON "custom_print_requests"("customer_id", "created_at");
CREATE UNIQUE INDEX "custom_print_estimates_request_id_version_key" ON "custom_print_estimates"("request_id", "version");
CREATE INDEX "custom_print_estimates_request_id_published_at_idx" ON "custom_print_estimates"("request_id", "published_at");
CREATE UNIQUE INDEX "b2b_quotes_inquiry_id_version_key" ON "b2b_quotes"("inquiry_id", "version");
CREATE INDEX "b2b_quotes_inquiry_id_status_idx" ON "b2b_quotes"("inquiry_id", "status");

ALTER TABLE "b2b_inquiries" ADD CONSTRAINT "b2b_inquiries_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_print_requests" ADD CONSTRAINT "custom_print_requests_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "custom_print_quotes" ADD CONSTRAINT "custom_print_quotes_estimate_id_fkey"
  FOREIGN KEY ("estimate_id") REFERENCES "custom_print_estimates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_print_estimates" ADD CONSTRAINT "custom_print_estimates_request_id_fkey"
  FOREIGN KEY ("request_id") REFERENCES "custom_print_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_print_estimates" ADD CONSTRAINT "custom_print_estimates_pricing_rule_version_id_fkey"
  FOREIGN KEY ("pricing_rule_version_id") REFERENCES "pricing_rule_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "custom_print_estimates" ADD CONSTRAINT "custom_print_estimates_published_by_admin_id_fkey"
  FOREIGN KEY ("published_by_admin_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "b2b_quotes" ADD CONSTRAINT "b2b_quotes_inquiry_id_fkey"
  FOREIGN KEY ("inquiry_id") REFERENCES "b2b_inquiries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "b2b_quotes" ADD CONSTRAINT "b2b_quotes_created_by_admin_id_fkey"
  FOREIGN KEY ("created_by_admin_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "b2b_quotes" ADD CONSTRAINT "b2b_quotes_decided_by_customer_id_fkey"
  FOREIGN KEY ("decided_by_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TYPE "AuditActorType" ADD VALUE IF NOT EXISTS 'CUSTOMER';
