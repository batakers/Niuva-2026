ALTER TABLE "customer_consents" ADD COLUMN "method" TEXT;

CREATE TABLE "customer_google_consents" (
    "token_hash" TEXT NOT NULL,
    "oauth_state_hash" TEXT,
    "return_to" TEXT NOT NULL,
    "terms_version" TEXT NOT NULL,
    "privacy_version" TEXT NOT NULL,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "age_declaration_version" TEXT NOT NULL,
    "age_declared_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    CONSTRAINT "customer_google_consents_pkey" PRIMARY KEY ("token_hash")
);

CREATE UNIQUE INDEX "customer_google_consents_oauth_state_hash_key" ON "customer_google_consents"("oauth_state_hash");
CREATE INDEX "customer_google_consents_expires_at_idx" ON "customer_google_consents"("expires_at");
