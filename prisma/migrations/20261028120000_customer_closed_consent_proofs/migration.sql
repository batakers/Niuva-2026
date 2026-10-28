CREATE TABLE "customer_closed_consent_proofs" (
    "id" UUID NOT NULL,
    "identity_hash" TEXT NOT NULL,
    "method" TEXT,
    "terms_version" TEXT NOT NULL,
    "privacy_version" TEXT NOT NULL,
    "accepted_at" TIMESTAMPTZ(6) NOT NULL,
    "age_declaration_version" TEXT,
    "age_declared_at" TIMESTAMPTZ(6),
    "closed_at" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "customer_closed_consent_proofs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_closed_consent_proofs_identity_hash_idx" ON "customer_closed_consent_proofs"("identity_hash");
CREATE INDEX "customer_closed_consent_proofs_expires_at_idx" ON "customer_closed_consent_proofs"("expires_at");
