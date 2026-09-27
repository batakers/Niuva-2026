ALTER TABLE "stored_files" ADD COLUMN "uploaded_by_customer_id" UUID;

CREATE INDEX "stored_files_uploaded_by_customer_id_upload_status_idx"
  ON "stored_files"("uploaded_by_customer_id", "upload_status");

ALTER TABLE "stored_files" ADD CONSTRAINT "stored_files_uploaded_by_customer_id_fkey"
  FOREIGN KEY ("uploaded_by_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
