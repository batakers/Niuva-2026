-- Phase 3: an upload capability is a short-lived, hashed bearer token.  The
-- nullable columns preserve compatibility with any retained historical rows;
-- new upload intents always write all three fields through the application.
ALTER TABLE "stored_files"
  ADD COLUMN "upload_token_hash" TEXT,
  ADD COLUMN "upload_expires_at" TIMESTAMPTZ(6),
  ADD COLUMN "uploaded_at" TIMESTAMPTZ(6);

CREATE UNIQUE INDEX "stored_files_upload_token_hash_key"
  ON "stored_files"("upload_token_hash");

CREATE INDEX "stored_files_upload_status_upload_expires_at_idx"
  ON "stored_files"("upload_status", "upload_expires_at");

ALTER TABLE "stored_files"
  ADD CONSTRAINT "stored_files_upload_expiry_after_creation"
  CHECK (
    "upload_expires_at" IS NULL
    OR "upload_expires_at" > "created_at"
  );
