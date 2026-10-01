-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "email_verified_at" TIMESTAMPTZ(6),
ALTER COLUMN "google_subject" DROP NOT NULL;

-- CreateTable
CREATE TABLE "customer_password_credentials" (
    "customer_id" UUID NOT NULL,
    "password_hash" TEXT NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_password_credentials_pkey" PRIMARY KEY ("customer_id")
);

-- CreateTable
CREATE TABLE "customer_pending_registrations" (
    "id" UUID NOT NULL,
    "handle_hash" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "normalized_email" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "terms_version" TEXT NOT NULL,
    "privacy_version" TEXT NOT NULL,
    "consent_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "delivery_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),

    CONSTRAINT "customer_pending_registrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_email_tokens" (
    "id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "customer_id" UUID,
    "pending_id" UUID,
    "return_to" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),

    CONSTRAINT "customer_email_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_consents" (
    "id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "terms_version" TEXT NOT NULL,
    "privacy_version" TEXT NOT NULL,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_auth_rate_limits" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "reset_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "customer_auth_rate_limits_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_pending_registrations_handle_hash_key" ON "customer_pending_registrations"("handle_hash");

-- CreateIndex
CREATE INDEX "customer_pending_registrations_normalized_email_idx" ON "customer_pending_registrations"("normalized_email");

-- CreateIndex
CREATE UNIQUE INDEX "customer_email_tokens_token_hash_key" ON "customer_email_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "customer_email_tokens_customer_id_purpose_idx" ON "customer_email_tokens"("customer_id", "purpose");

-- CreateIndex
CREATE INDEX "customer_email_tokens_pending_id_idx" ON "customer_email_tokens"("pending_id");

-- AddForeignKey
ALTER TABLE "customer_password_credentials" ADD CONSTRAINT "customer_password_credentials_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_email_tokens" ADD CONSTRAINT "customer_email_tokens_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_email_tokens" ADD CONSTRAINT "customer_email_tokens_pending_id_fkey" FOREIGN KEY ("pending_id") REFERENCES "customer_pending_registrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_consents" ADD CONSTRAINT "customer_consents_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Existing Google identities already proved ownership of their email.
UPDATE customers SET email_verified_at = created_at WHERE google_subject IS NOT NULL;
ALTER TABLE customer_email_tokens ADD CONSTRAINT customer_email_token_owner CHECK (
  (purpose = 'verify' AND pending_id IS NOT NULL AND customer_id IS NULL) OR
  (purpose = 'reset' AND customer_id IS NOT NULL AND pending_id IS NULL)
);
