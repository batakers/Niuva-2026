CREATE TABLE "durable_outbox_messages" (
  "id" UUID NOT NULL,
  "message_key" TEXT NOT NULL,
  "proof_kind" TEXT NOT NULL,
  "proof_id" UUID NOT NULL,
  "purpose" TEXT NOT NULL,
  "template_version" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "sealed_payload" TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL,
  "due_at" TIMESTAMPTZ(6) NOT NULL,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "state" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lease_id" UUID,
  "lease_expires_at" TIMESTAMPTZ(6),
  "terminal_at" TIMESTAMPTZ(6),
  "failure_category" TEXT,
  "provider_reference" TEXT,
  CONSTRAINT "durable_outbox_messages_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "outbox_purpose" CHECK (
    ("proof_kind" = 'AUTH' AND "purpose" IN ('AUTH_VERIFY', 'AUTH_RESET')) OR
    ("proof_kind" = 'PRIVACY' AND "purpose" IN ('PRIVACY_EXPORT', 'PRIVACY_CLOSE'))
  ),
  CONSTRAINT "outbox_template" CHECK ("template_version" = 'v1'),
  CONSTRAINT "outbox_identity" CHECK (length("message_key") BETWEEN 1 AND 200 AND "fingerprint" ~ '^[a-f0-9]{64}$'),
  CONSTRAINT "outbox_clock" CHECK ("created_at" <= "due_at" AND "due_at" < "expires_at" AND ("terminal_at" IS NULL OR "terminal_at" >= "created_at")),
  CONSTRAINT "outbox_attempts" CHECK ("attempts" >= 0),
  CONSTRAINT "outbox_payload_state" CHECK (
    ("state" IN ('PENDING', 'LEASED') AND "sealed_payload" IS NOT NULL AND length("sealed_payload") BETWEEN 1 AND 8192 AND "terminal_at" IS NULL) OR
    ("state" IN ('ACCEPTED', 'FAILED', 'CANCELLED', 'EXPIRED') AND "sealed_payload" IS NULL AND "terminal_at" IS NOT NULL)
  ),
  CONSTRAINT "outbox_lease" CHECK (
    ("state" = 'LEASED' AND "lease_id" IS NOT NULL AND "lease_expires_at" IS NOT NULL AND "created_at" < "lease_expires_at" AND "lease_expires_at" <= "expires_at") OR
    ("state" <> 'LEASED' AND "lease_id" IS NULL AND "lease_expires_at" IS NULL)
  )
);
CREATE UNIQUE INDEX "durable_outbox_messages_message_key_key" ON "durable_outbox_messages"("message_key");
CREATE UNIQUE INDEX "durable_outbox_messages_proof_kind_proof_id_key" ON "durable_outbox_messages"("proof_kind", "proof_id");
CREATE INDEX "durable_outbox_messages_state_due_at_idx" ON "durable_outbox_messages"("state", "due_at");
CREATE INDEX "durable_outbox_messages_state_expires_at_idx" ON "durable_outbox_messages"("state", "expires_at");
