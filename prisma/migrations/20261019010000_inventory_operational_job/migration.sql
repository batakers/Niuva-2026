ALTER TABLE "operational_job_states" DROP CONSTRAINT "operational_job_name";
ALTER TABLE "operational_job_states" ADD CONSTRAINT "operational_job_name"
  CHECK ("name" IN ('OUTBOX_DELIVERY', 'OUTBOX_EXPIRY', 'CUSTOMER_AUTH_CLEANUP', 'CUSTOMER_PRIVACY_CLEANUP', 'INVENTORY_RESERVATIONS'));
