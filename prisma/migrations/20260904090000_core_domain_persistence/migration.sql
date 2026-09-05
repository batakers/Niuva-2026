-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'ADMIN');

-- CreateEnum
CREATE TYPE "AuditActorType" AS ENUM ('ADMIN', 'SYSTEM', 'WEBHOOK');

-- CreateEnum
CREATE TYPE "InquiryStage" AS ENUM ('IDEA', 'SKETCH', 'CAD', 'PROTOTYPE', 'EXISTING_PRODUCT');

-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'QUOTED', 'WON', 'LOST', 'CLOSED');

-- CreateEnum
CREATE TYPE "OrderItemType" AS ENUM ('PRODUCT', 'CUSTOM_PRINT');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'PROCESSING', 'READY_TO_SHIP', 'SHIPPED', 'COMPLETED', 'CANCELLED', 'SUBMITTED', 'UNDER_REVIEW', 'WAITING_FOR_APPROVAL', 'WAITING_PAYMENT', 'IN_PRODUCTION', 'FINISHING_QC', 'WAITING_SHIPPING_PAYMENT');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('RETAIL', 'CUSTOM_PRINT');

-- CreateEnum
CREATE TYPE "PaymentAttemptStatus" AS ENUM ('PENDING', 'SETTLED', 'FAILED', 'EXPIRED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentPurpose" AS ENUM ('ORDER_TOTAL', 'CUSTOM_SHIPPING');

-- CreateEnum
CREATE TYPE "PricingRuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDING', 'SHIPPED', 'DELIVERED', 'EXCEPTION');

-- CreateEnum
CREATE TYPE "StockReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED');

-- CreateEnum
CREATE TYPE "StorageBucketScope" AS ENUM ('PRIVATE_CUSTOMER', 'PUBLIC_MEDIA');

-- CreateEnum
CREATE TYPE "StoredFileStatus" AS ENUM ('PENDING', 'UPLOADED', 'VERIFIED', 'REJECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "CustomPrintRequestStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'QUOTE_READY', 'QUOTE_SENT', 'APPROVED', 'DECLINED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CustomPrintQuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "IdempotencyStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "admin_profiles" (
    "id" UUID NOT NULL,
    "clerk_user_id" TEXT NOT NULL,
    "display_name" TEXT,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "admin_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_projects" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "process" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "service_label" TEXT NOT NULL,
    "client_name" TEXT,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "portfolio_projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolio_media" (
    "id" UUID NOT NULL,
    "project_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "alt_text" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "category_id" UUID,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_rp" DECIMAL(18,0) NOT NULL,
    "stock_on_hand" INTEGER NOT NULL DEFAULT 0,
    "weight_grams" DECIMAL(12,3) NOT NULL,
    "length_cm" DECIMAL(12,3),
    "width_cm" DECIMAL(12,3),
    "height_cm" DECIMAL(12,3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_media" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "alt_text" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL,
    "order_number" TEXT NOT NULL,
    "order_type" "OrderType" NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL DEFAULT 'IDR',
    "items_subtotal_rp" DECIMAL(18,0) NOT NULL,
    "shipping_total_rp" DECIMAL(18,0) NOT NULL,
    "grand_total_rp" DECIMAL(18,0) NOT NULL,
    "public_token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "paid_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "variant_id" UUID,
    "custom_quote_id" UUID,
    "item_type" "OrderItemType" NOT NULL,
    "name_snapshot" TEXT NOT NULL,
    "sku_snapshot" TEXT,
    "unit_price_rp" DECIMAL(18,0) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "line_total_rp" DECIMAL(18,0) NOT NULL,
    "configuration_json" JSONB,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_addresses" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address_line" TEXT NOT NULL,
    "district" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postal_code" TEXT NOT NULL,
    "country_code" CHAR(2) NOT NULL DEFAULT 'ID',
    "biteship_area_id" TEXT,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),

    CONSTRAINT "order_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_reservations" (
    "id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "StockReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipment_rate_snapshots" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'BITESHIP',
    "courier_code" TEXT NOT NULL,
    "service_code" TEXT NOT NULL,
    "courier_name" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "price_rp" DECIMAL(18,0) NOT NULL,
    "eta_text" TEXT,
    "provider_payload_json" JSONB NOT NULL,
    "selected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipment_rate_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'PENDING',
    "courier_code" TEXT,
    "service_code" TEXT,
    "tracking_number" TEXT,
    "final_weight_grams" DECIMAL(12,3),
    "final_length_cm" DECIMAL(12,3),
    "final_width_cm" DECIMAL(12,3),
    "final_height_cm" DECIMAL(12,3),
    "shipping_amount_rp" DECIMAL(18,0),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_attempts" (
    "id" UUID NOT NULL,
    "order_id" UUID NOT NULL,
    "purpose" "PaymentPurpose" NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'MIDTRANS',
    "provider_order_id" TEXT NOT NULL,
    "amount_rp" DECIMAL(18,0) NOT NULL,
    "status" "PaymentAttemptStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "snap_token" TEXT,
    "redirect_url" TEXT,
    "provider_transaction_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "settled_at" TIMESTAMPTZ(6),

    CONSTRAINT "payment_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_events" (
    "id" UUID NOT NULL,
    "payment_attempt_id" UUID,
    "provider" TEXT NOT NULL,
    "event_fingerprint" TEXT NOT NULL,
    "provider_transaction_id" TEXT,
    "provider_order_id" TEXT NOT NULL,
    "payload_json" JSONB,
    "received_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ(6),
    "processing_result" TEXT,

    CONSTRAINT "payment_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2b_inquiries" (
    "id" UUID NOT NULL,
    "reference_number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "company" TEXT,
    "reference_link" TEXT,
    "project_goal" TEXT NOT NULL,
    "current_stage" "InquiryStage" NOT NULL,
    "description" TEXT NOT NULL,
    "target_quantity" TEXT NOT NULL,
    "target_deadline" DATE,
    "budget_range" TEXT,
    "preferred_service" TEXT,
    "confidentiality_ack" BOOLEAN NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "public_token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "b2b_inquiries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stored_files" (
    "id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "bucket_scope" "StorageBucketScope" NOT NULL,
    "original_name" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" BIGINT NOT NULL,
    "sha256" TEXT,
    "upload_status" "StoredFileStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "stored_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "b2b_inquiry_files" (
    "inquiry_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "b2b_inquiry_files_pkey" PRIMARY KEY ("inquiry_id","file_id")
);

-- CreateTable
CREATE TABLE "custom_print_requests" (
    "id" UUID NOT NULL,
    "reference_number" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_phone" TEXT NOT NULL,
    "material_requested" TEXT NOT NULL,
    "color_requested" TEXT,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "unit_confirmation" TEXT,
    "status" "CustomPrintRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
    "public_token_hash" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "custom_print_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_print_reviews" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "reviewed_by_admin_id" UUID NOT NULL,
    "verified_weight_g" DECIMAL(12,6) NOT NULL,
    "print_duration_seconds" INTEGER NOT NULL,
    "material_code" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "configuration_json" JSONB,
    "notes" TEXT,
    "reviewed_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "custom_print_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_print_request_files" (
    "request_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_print_request_files_pkey" PRIMARY KEY ("request_id","file_id")
);

-- CreateTable
CREATE TABLE "pricing_rule_versions" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "definition_json" JSONB NOT NULL,
    "status" "PricingRuleStatus" NOT NULL DEFAULT 'DRAFT',
    "approved_by_admin_id" UUID,
    "approved_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pricing_rule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_print_quotes" (
    "id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "quote_number" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "pricing_rule_version_id" UUID NOT NULL,
    "verified_weight_g" DECIMAL(12,6) NOT NULL,
    "print_duration_seconds" INTEGER NOT NULL,
    "material_code" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "material_subtotal_rp" DECIMAL(18,6) NOT NULL,
    "machine_subtotal_rp" DECIMAL(18,6) NOT NULL,
    "unrounded_total_rp" DECIMAL(18,6) NOT NULL,
    "final_total_rp" DECIMAL(18,0) NOT NULL,
    "calculation_snapshot" JSONB NOT NULL,
    "status" "CustomPrintQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "public_token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6),
    "created_by_admin_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(6),
    "accepted_at" TIMESTAMPTZ(6),

    CONSTRAINT "custom_print_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_type" "AuditActorType" NOT NULL,
    "actor_id" TEXT,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "before_json" JSONB,
    "after_json" JSONB,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_records" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "request_hash" TEXT NOT NULL,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "response_status" INTEGER,
    "response_json" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "idempotency_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_profiles_clerk_user_id_key" ON "admin_profiles"("clerk_user_id");

-- CreateIndex
CREATE INDEX "admin_profiles_is_active_role_idx" ON "admin_profiles"("is_active", "role");

-- CreateIndex
CREATE UNIQUE INDEX "services_slug_key" ON "services"("slug");

-- CreateIndex
CREATE INDEX "services_is_published_sort_order_idx" ON "services"("is_published", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_projects_slug_key" ON "portfolio_projects"("slug");

-- CreateIndex
CREATE INDEX "portfolio_projects_is_published_is_featured_published_at_idx" ON "portfolio_projects"("is_published", "is_featured", "published_at");

-- CreateIndex
CREATE INDEX "portfolio_media_project_id_sort_order_idx" ON "portfolio_media"("project_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "portfolio_media_project_id_sort_order_key" ON "portfolio_media"("project_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE INDEX "categories_is_active_sort_order_idx" ON "categories"("is_active", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_is_published_created_at_idx" ON "products"("is_published", "created_at");

-- CreateIndex
CREATE INDEX "products_category_id_is_published_idx" ON "products"("category_id", "is_published");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "product_variants_product_id_is_active_idx" ON "product_variants"("product_id", "is_active");

-- CreateIndex
CREATE INDEX "product_media_product_id_sort_order_idx" ON "product_media"("product_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "product_media_product_id_sort_order_key" ON "product_media"("product_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE UNIQUE INDEX "orders_public_token_hash_key" ON "orders"("public_token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_inquiries_public_token_hash_key" ON "b2b_inquiries"("public_token_hash");

-- CreateIndex
CREATE INDEX "orders_status_created_at_idx" ON "orders"("status", "created_at");

-- CreateIndex
CREATE INDEX "orders_customer_email_created_at_idx" ON "orders"("customer_email", "created_at");

-- CreateIndex
CREATE INDEX "orders_order_type_status_created_at_idx" ON "orders"("order_type", "status", "created_at");

-- CreateIndex
CREATE INDEX "order_items_order_id_idx" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "order_items_variant_id_idx" ON "order_items"("variant_id");

-- CreateIndex
CREATE INDEX "order_items_custom_quote_id_idx" ON "order_items"("custom_quote_id");

-- CreateIndex
CREATE UNIQUE INDEX "order_addresses_order_id_key" ON "order_addresses"("order_id");

-- CreateIndex
CREATE INDEX "stock_reservations_variant_id_status_expires_at_idx" ON "stock_reservations"("variant_id", "status", "expires_at");

-- CreateIndex
CREATE INDEX "stock_reservations_order_id_idx" ON "stock_reservations"("order_id");

-- CreateIndex
CREATE INDEX "shipment_rate_snapshots_order_id_selected_at_idx" ON "shipment_rate_snapshots"("order_id", "selected_at");

-- CreateIndex
CREATE INDEX "shipments_order_id_status_idx" ON "shipments"("order_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_provider_order_id_key" ON "payment_attempts"("provider_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "payment_attempts_provider_transaction_id_key" ON "payment_attempts"("provider_transaction_id");

-- CreateIndex
CREATE INDEX "payment_attempts_order_id_status_idx" ON "payment_attempts"("order_id", "status");

-- CreateIndex
CREATE INDEX "payment_attempts_status_expires_at_idx" ON "payment_attempts"("status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "payment_events_event_fingerprint_key" ON "payment_events"("event_fingerprint");

-- CreateIndex
CREATE INDEX "payment_events_payment_attempt_id_idx" ON "payment_events"("payment_attempt_id");

-- CreateIndex
CREATE INDEX "payment_events_provider_order_id_idx" ON "payment_events"("provider_order_id");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_inquiries_reference_number_key" ON "b2b_inquiries"("reference_number");

-- CreateIndex
CREATE INDEX "b2b_inquiries_status_created_at_idx" ON "b2b_inquiries"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "stored_files_storage_key_key" ON "stored_files"("storage_key");

-- CreateIndex
CREATE INDEX "stored_files_upload_status_created_at_idx" ON "stored_files"("upload_status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "b2b_inquiry_files_file_id_key" ON "b2b_inquiry_files"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_print_requests_reference_number_key" ON "custom_print_requests"("reference_number");

-- CreateIndex
CREATE UNIQUE INDEX "custom_print_requests_public_token_hash_key" ON "custom_print_requests"("public_token_hash");

-- CreateIndex
CREATE INDEX "custom_print_requests_status_created_at_idx" ON "custom_print_requests"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "custom_print_reviews_request_id_key" ON "custom_print_reviews"("request_id");

-- CreateIndex
CREATE INDEX "custom_print_reviews_reviewed_by_admin_id_reviewed_at_idx" ON "custom_print_reviews"("reviewed_by_admin_id", "reviewed_at");

-- CreateIndex
CREATE UNIQUE INDEX "custom_print_request_files_file_id_key" ON "custom_print_request_files"("file_id");

-- CreateIndex
CREATE INDEX "pricing_rule_versions_status_created_at_idx" ON "pricing_rule_versions"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "pricing_rule_versions_code_version_key" ON "pricing_rule_versions"("code", "version");

-- CreateIndex
CREATE UNIQUE INDEX "custom_print_quotes_quote_number_key" ON "custom_print_quotes"("quote_number");

-- CreateIndex
CREATE UNIQUE INDEX "custom_print_quotes_public_token_hash_key" ON "custom_print_quotes"("public_token_hash");

-- CreateIndex
CREATE INDEX "custom_print_quotes_request_id_status_idx" ON "custom_print_quotes"("request_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "custom_print_quotes_request_id_version_key" ON "custom_print_quotes"("request_id", "version");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at");

-- CreateIndex
CREATE INDEX "idempotency_records_scope_status_expires_at_idx" ON "idempotency_records"("scope", "status", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_records_scope_idempotency_key_key" ON "idempotency_records"("scope", "idempotency_key");

-- AddForeignKey
ALTER TABLE "portfolio_media" ADD CONSTRAINT "portfolio_media_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "portfolio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_media" ADD CONSTRAINT "product_media_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_custom_quote_id_fkey" FOREIGN KEY ("custom_quote_id") REFERENCES "custom_print_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_addresses" ADD CONSTRAINT "order_addresses_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_reservations" ADD CONSTRAINT "stock_reservations_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipment_rate_snapshots" ADD CONSTRAINT "shipment_rate_snapshots_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_events" ADD CONSTRAINT "payment_events_payment_attempt_id_fkey" FOREIGN KEY ("payment_attempt_id") REFERENCES "payment_attempts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_inquiry_files" ADD CONSTRAINT "b2b_inquiry_files_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "b2b_inquiries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "b2b_inquiry_files" ADD CONSTRAINT "b2b_inquiry_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "stored_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_print_request_files" ADD CONSTRAINT "custom_print_request_files_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "custom_print_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_print_request_files" ADD CONSTRAINT "custom_print_request_files_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "stored_files"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_print_reviews" ADD CONSTRAINT "custom_print_reviews_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "custom_print_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_print_reviews" ADD CONSTRAINT "custom_print_reviews_reviewed_by_admin_id_fkey" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pricing_rule_versions" ADD CONSTRAINT "pricing_rule_versions_approved_by_admin_id_fkey" FOREIGN KEY ("approved_by_admin_id") REFERENCES "admin_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_print_quotes" ADD CONSTRAINT "custom_print_quotes_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "custom_print_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_print_quotes" ADD CONSTRAINT "custom_print_quotes_pricing_rule_version_id_fkey" FOREIGN KEY ("pricing_rule_version_id") REFERENCES "pricing_rule_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_print_quotes" ADD CONSTRAINT "custom_print_quotes_created_by_admin_id_fkey" FOREIGN KEY ("created_by_admin_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Domain invariants deliberately live in SQL because Prisma's schema language
-- does not express all cross-column and deferred ownership constraints.
ALTER TABLE "product_variants"
  ADD CONSTRAINT "product_variants_nonnegative_check"
  CHECK (
    "price_rp" >= 0
    AND "stock_on_hand" >= 0
    AND "weight_grams" >= 0
    AND ("length_cm" IS NULL OR "length_cm" >= 0)
    AND ("width_cm" IS NULL OR "width_cm" >= 0)
    AND ("height_cm" IS NULL OR "height_cm" >= 0)
  );

ALTER TABLE "orders"
  ADD CONSTRAINT "orders_amounts_check"
  CHECK (
    "items_subtotal_rp" >= 0
    AND "shipping_total_rp" >= 0
    AND "grand_total_rp" >= 0
    AND "grand_total_rp" = "items_subtotal_rp" + "shipping_total_rp"
  );

ALTER TABLE "order_items"
  ADD CONSTRAINT "order_items_commercial_snapshot_check"
  CHECK (
    "quantity" > 0
    AND "unit_price_rp" >= 0
    AND "line_total_rp" >= 0
    AND "line_total_rp" = "unit_price_rp" * "quantity"
    AND (
      ("item_type" = 'PRODUCT' AND "variant_id" IS NOT NULL AND "custom_quote_id" IS NULL)
      OR
      ("item_type" = 'CUSTOM_PRINT' AND "variant_id" IS NULL AND "custom_quote_id" IS NOT NULL)
    )
  );

ALTER TABLE "stock_reservations"
  ADD CONSTRAINT "stock_reservations_quantity_check"
  CHECK ("quantity" > 0);

ALTER TABLE "shipment_rate_snapshots"
  ADD CONSTRAINT "shipment_rate_snapshots_price_check"
  CHECK ("price_rp" >= 0);

ALTER TABLE "shipments"
  ADD CONSTRAINT "shipments_nonnegative_measurement_check"
  CHECK (
    ("final_weight_grams" IS NULL OR "final_weight_grams" >= 0)
    AND ("final_length_cm" IS NULL OR "final_length_cm" >= 0)
    AND ("final_width_cm" IS NULL OR "final_width_cm" >= 0)
    AND ("final_height_cm" IS NULL OR "final_height_cm" >= 0)
    AND ("shipping_amount_rp" IS NULL OR "shipping_amount_rp" >= 0)
  );

ALTER TABLE "payment_attempts"
  ADD CONSTRAINT "payment_attempts_amount_check"
  CHECK ("amount_rp" >= 0 AND "expires_at" > "created_at");

ALTER TABLE "stored_files"
  ADD CONSTRAINT "stored_files_lifecycle_check"
  CHECK (
    "size_bytes" >= 0
    AND ("upload_status" <> 'VERIFIED' OR "verified_at" IS NOT NULL)
    AND ("upload_status" <> 'DELETED' OR "deleted_at" IS NOT NULL)
  );

ALTER TABLE "custom_print_requests"
  ADD CONSTRAINT "custom_print_requests_quantity_check"
  CHECK ("quantity" > 0);

ALTER TABLE "custom_print_reviews"
  ADD CONSTRAINT "custom_print_reviews_input_check"
  CHECK (
    "verified_weight_g" >= 0
    AND "print_duration_seconds" >= 0
    AND "quantity" > 0
  );

ALTER TABLE "pricing_rule_versions"
  ADD CONSTRAINT "pricing_rule_versions_version_check"
  CHECK ("version" > 0);

ALTER TABLE "custom_print_quotes"
  ADD CONSTRAINT "custom_print_quotes_calculation_check"
  CHECK (
    "version" > 0
    AND "verified_weight_g" >= 0
    AND "print_duration_seconds" >= 0
    AND "quantity" > 0
    AND "material_subtotal_rp" >= 0
    AND "machine_subtotal_rp" >= 0
    AND "unrounded_total_rp" = "material_subtotal_rp" + "machine_subtotal_rp"
    AND "final_total_rp" >= 0
    AND "final_total_rp" = ROUND("unrounded_total_rp", 0)
  );

ALTER TABLE "idempotency_records"
  ADD CONSTRAINT "idempotency_records_shape_check"
  CHECK (
    LENGTH(BTRIM("scope")) > 0
    AND LENGTH(BTRIM("idempotency_key")) > 0
    AND LENGTH(BTRIM("request_hash")) > 0
    AND (
      "status" <> 'COMPLETED'
      OR ("response_status" IS NOT NULL AND "completed_at" IS NOT NULL)
    )
  );

CREATE FUNCTION "niuva_enforce_inquiry_reference"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_inquiry_ids UUID[];
  target_inquiry_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'b2b_inquiries' THEN
    IF TG_OP = 'DELETE' THEN
      target_inquiry_ids := ARRAY[OLD."id"];
    ELSIF TG_OP = 'INSERT' THEN
      target_inquiry_ids := ARRAY[NEW."id"];
    ELSE
      target_inquiry_ids := ARRAY[OLD."id", NEW."id"];
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    target_inquiry_ids := ARRAY[OLD."inquiry_id"];
  ELSIF TG_OP = 'INSERT' THEN
    target_inquiry_ids := ARRAY[NEW."inquiry_id"];
  ELSE
    target_inquiry_ids := ARRAY[OLD."inquiry_id", NEW."inquiry_id"];
  END IF;

  FOREACH target_inquiry_id IN ARRAY target_inquiry_ids
  LOOP
    IF EXISTS (
      SELECT 1
      FROM "b2b_inquiries"
      WHERE "id" = target_inquiry_id
        AND NULLIF(BTRIM("reference_link"), '') IS NULL
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "b2b_inquiry_files"
      WHERE "inquiry_id" = target_inquiry_id
    ) THEN
      RAISE EXCEPTION 'a B2B inquiry needs a private file or reference link'
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "b2b_inquiry_reference_check"
AFTER INSERT OR UPDATE OR DELETE ON "b2b_inquiries"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "niuva_enforce_inquiry_reference"();

CREATE CONSTRAINT TRIGGER "b2b_inquiry_file_reference_check"
AFTER INSERT OR UPDATE OR DELETE ON "b2b_inquiry_files"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "niuva_enforce_inquiry_reference"();

CREATE FUNCTION "niuva_enforce_file_ownership_integrity"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_file_ids UUID[];
  target_file_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_file_ids := ARRAY[OLD."file_id"];
  ELSIF TG_OP = 'INSERT' THEN
    target_file_ids := ARRAY[NEW."file_id"];
  ELSE
    target_file_ids := ARRAY[OLD."file_id", NEW."file_id"];
  END IF;

  FOREACH target_file_id IN ARRAY target_file_ids
  LOOP
    IF EXISTS (
      SELECT 1
      FROM "b2b_inquiry_files"
      WHERE "file_id" = target_file_id
    )
    AND EXISTS (
      SELECT 1
      FROM "custom_print_request_files"
      WHERE "file_id" = target_file_id
    ) THEN
      RAISE EXCEPTION 'a stored file cannot belong to more than one domain owner'
        USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM "stored_files"
      WHERE "id" = target_file_id
        AND "upload_status" = 'VERIFIED'
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "b2b_inquiry_files"
      WHERE "file_id" = target_file_id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM "custom_print_request_files"
      WHERE "file_id" = target_file_id
    ) THEN
      RAISE EXCEPTION 'a verified stored file must have one domain owner'
        USING ERRCODE = '23514';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER "b2b_inquiry_file_ownership_check"
AFTER INSERT OR UPDATE OR DELETE ON "b2b_inquiry_files"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "niuva_enforce_file_ownership_integrity"();

CREATE CONSTRAINT TRIGGER "custom_print_request_file_ownership_check"
AFTER INSERT OR UPDATE OR DELETE ON "custom_print_request_files"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "niuva_enforce_file_ownership_integrity"();

CREATE CONSTRAINT TRIGGER "stored_file_verified_owner_check"
AFTER INSERT OR UPDATE ON "stored_files"
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION "niuva_enforce_file_ownership_integrity"();

CREATE FUNCTION "niuva_reject_committed_snapshot_mutation"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    IF NEW."order_type" IS DISTINCT FROM OLD."order_type"
      OR NEW."currency" IS DISTINCT FROM OLD."currency"
      OR NEW."items_subtotal_rp" IS DISTINCT FROM OLD."items_subtotal_rp"
      OR NEW."shipping_total_rp" IS DISTINCT FROM OLD."shipping_total_rp"
      OR NEW."grand_total_rp" IS DISTINCT FROM OLD."grand_total_rp"
      OR NEW."public_token_hash" IS DISTINCT FROM OLD."public_token_hash" THEN
      RAISE EXCEPTION 'order commercial snapshots are immutable'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'order_items' THEN
    IF NEW."order_id" IS DISTINCT FROM OLD."order_id"
      OR NEW."variant_id" IS DISTINCT FROM OLD."variant_id"
      OR NEW."custom_quote_id" IS DISTINCT FROM OLD."custom_quote_id"
      OR NEW."item_type" IS DISTINCT FROM OLD."item_type"
      OR NEW."name_snapshot" IS DISTINCT FROM OLD."name_snapshot"
      OR NEW."sku_snapshot" IS DISTINCT FROM OLD."sku_snapshot"
      OR NEW."unit_price_rp" IS DISTINCT FROM OLD."unit_price_rp"
      OR NEW."quantity" IS DISTINCT FROM OLD."quantity"
      OR NEW."line_total_rp" IS DISTINCT FROM OLD."line_total_rp"
      OR NEW."configuration_json" IS DISTINCT FROM OLD."configuration_json" THEN
      RAISE EXCEPTION 'order item commercial snapshots are immutable'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'shipment_rate_snapshots' THEN
    RAISE EXCEPTION 'shipment rate snapshots are immutable'
      USING ERRCODE = '23514';
  ELSIF TG_TABLE_NAME = 'payment_attempts' THEN
    IF NEW."order_id" IS DISTINCT FROM OLD."order_id"
      OR NEW."purpose" IS DISTINCT FROM OLD."purpose"
      OR NEW."provider" IS DISTINCT FROM OLD."provider"
      OR NEW."provider_order_id" IS DISTINCT FROM OLD."provider_order_id"
      OR NEW."amount_rp" IS DISTINCT FROM OLD."amount_rp"
      OR NEW."expires_at" IS DISTINCT FROM OLD."expires_at"
      OR (OLD."snap_token" IS NOT NULL AND NEW."snap_token" IS DISTINCT FROM OLD."snap_token")
      OR (OLD."redirect_url" IS NOT NULL AND NEW."redirect_url" IS DISTINCT FROM OLD."redirect_url") THEN
      RAISE EXCEPTION 'payment attempt commercial snapshots are immutable'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'custom_print_quotes' THEN
    IF OLD."status" = 'SENT' AND (
      NEW."request_id" IS DISTINCT FROM OLD."request_id"
      OR NEW."quote_number" IS DISTINCT FROM OLD."quote_number"
      OR NEW."version" IS DISTINCT FROM OLD."version"
      OR NEW."pricing_rule_version_id" IS DISTINCT FROM OLD."pricing_rule_version_id"
      OR NEW."verified_weight_g" IS DISTINCT FROM OLD."verified_weight_g"
      OR NEW."print_duration_seconds" IS DISTINCT FROM OLD."print_duration_seconds"
      OR NEW."material_code" IS DISTINCT FROM OLD."material_code"
      OR NEW."quantity" IS DISTINCT FROM OLD."quantity"
      OR NEW."material_subtotal_rp" IS DISTINCT FROM OLD."material_subtotal_rp"
      OR NEW."machine_subtotal_rp" IS DISTINCT FROM OLD."machine_subtotal_rp"
      OR NEW."unrounded_total_rp" IS DISTINCT FROM OLD."unrounded_total_rp"
      OR NEW."final_total_rp" IS DISTINCT FROM OLD."final_total_rp"
      OR NEW."calculation_snapshot" IS DISTINCT FROM OLD."calculation_snapshot"
      OR NEW."public_token_hash" IS DISTINCT FROM OLD."public_token_hash"
      OR NEW."expires_at" IS DISTINCT FROM OLD."expires_at"
      OR NEW."created_by_admin_id" IS DISTINCT FROM OLD."created_by_admin_id"
      OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
      OR NEW."sent_at" IS DISTINCT FROM OLD."sent_at"
    ) THEN
      RAISE EXCEPTION 'sent quote snapshots are immutable; create a new version'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER "orders_commercial_snapshot_immutable"
BEFORE UPDATE ON "orders"
FOR EACH ROW
EXECUTE FUNCTION "niuva_reject_committed_snapshot_mutation"();

CREATE TRIGGER "order_items_commercial_snapshot_immutable"
BEFORE UPDATE ON "order_items"
FOR EACH ROW
EXECUTE FUNCTION "niuva_reject_committed_snapshot_mutation"();

CREATE TRIGGER "shipment_rate_snapshots_immutable"
BEFORE UPDATE ON "shipment_rate_snapshots"
FOR EACH ROW
EXECUTE FUNCTION "niuva_reject_committed_snapshot_mutation"();

CREATE TRIGGER "payment_attempts_commercial_snapshot_immutable"
BEFORE UPDATE ON "payment_attempts"
FOR EACH ROW
EXECUTE FUNCTION "niuva_reject_committed_snapshot_mutation"();

CREATE TRIGGER "custom_print_quotes_sent_snapshot_immutable"
BEFORE UPDATE ON "custom_print_quotes"
FOR EACH ROW
EXECUTE FUNCTION "niuva_reject_committed_snapshot_mutation"();
