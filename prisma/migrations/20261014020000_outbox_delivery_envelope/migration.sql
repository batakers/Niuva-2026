ALTER TABLE "durable_outbox_messages" ADD COLUMN "sealed_envelope" TEXT;
ALTER TABLE "durable_outbox_messages" ADD CONSTRAINT "outbox_envelope_size"
  CHECK ("sealed_envelope" IS NULL OR length("sealed_envelope") BETWEEN 1 AND 24000);
