ALTER TABLE "orders" ADD COLUMN "shipped_at" TIMESTAMPTZ(6);

ALTER TABLE "durable_outbox_messages" DROP CONSTRAINT "outbox_purpose";
ALTER TABLE "durable_outbox_messages" ADD CONSTRAINT "outbox_purpose" CHECK (
  (proof_kind = 'AUTH' AND purpose IN ('AUTH_VERIFY', 'AUTH_RESET')) OR
  (proof_kind = 'PRIVACY' AND purpose IN ('PRIVACY_EXPORT', 'PRIVACY_CLOSE')) OR
  (proof_kind = 'ORDER' AND purpose = 'ORDER_RECEIVED') OR
  (proof_kind = 'PAYMENT' AND purpose = 'PAYMENT_CONFIRMED') OR
  (proof_kind = 'QUOTE' AND purpose = 'QUOTE_AVAILABLE') OR
  (proof_kind = 'SHIPMENT' AND purpose = 'ORDER_SHIPPED')
);
ALTER TABLE "operational_job_states" DROP CONSTRAINT "operational_job_name";
ALTER TABLE "operational_job_states" ADD CONSTRAINT "operational_job_name" CHECK (name IN (
  'OUTBOX_DELIVERY', 'OUTBOX_EXPIRY', 'CUSTOMER_AUTH_CLEANUP', 'CUSTOMER_PRIVACY_CLEANUP',
  'INVENTORY_RESERVATIONS', 'CUSTOMER_FILE_RETENTION', 'PAYMENT_RECONCILIATION', 'OUTBOX_BUSINESS'
));
