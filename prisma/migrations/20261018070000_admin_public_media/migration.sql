CREATE TYPE "PublicMediaAssetStatus" AS ENUM ('PENDING', 'VERIFYING', 'VERIFIED', 'FAILED');
CREATE TABLE "public_media_assets" (
  "id" UUID NOT NULL,
  "product_id" UUID,
  "project_id" UUID,
  "uploaded_by_id" UUID NOT NULL,
  "storage_key" TEXT NOT NULL,
  "quarantine_key" TEXT NOT NULL,
  "content_type" TEXT NOT NULL,
  "size_bytes" INTEGER NOT NULL,
  "sha256" TEXT,
  "status" "PublicMediaAssetStatus" NOT NULL DEFAULT 'PENDING',
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "verified_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "public_media_assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "public_media_owner_check" CHECK (("product_id" IS NOT NULL)::int + ("project_id" IS NOT NULL)::int = 1),
  CONSTRAINT "public_media_size_check" CHECK ("size_bytes" BETWEEN 1 AND 10485760),
  CONSTRAINT "public_media_type_check" CHECK ("content_type" IN ('image/jpeg', 'image/png', 'image/webp')),
  CONSTRAINT "public_media_verified_check" CHECK ("status" <> 'VERIFIED' OR ("verified_at" IS NOT NULL AND "sha256" IS NOT NULL)),
  CONSTRAINT "public_media_product_fk" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "public_media_project_fk" FOREIGN KEY ("project_id") REFERENCES "portfolio_projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "public_media_admin_fk" FOREIGN KEY ("uploaded_by_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "public_media_assets_storage_key_key" ON "public_media_assets"("storage_key");
CREATE UNIQUE INDEX "public_media_assets_quarantine_key_key" ON "public_media_assets"("quarantine_key");
CREATE INDEX "public_media_assets_product_id_status_idx" ON "public_media_assets"("product_id", "status");
CREATE INDEX "public_media_assets_project_id_status_idx" ON "public_media_assets"("project_id", "status");
CREATE INDEX "public_media_assets_status_expires_at_idx" ON "public_media_assets"("status", "expires_at");
