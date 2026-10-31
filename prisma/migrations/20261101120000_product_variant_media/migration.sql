-- Owner decision 1 Nov 2026: a variant may point at its own photo in the product gallery.
-- Nullable and additive; deleting the photo only clears the link.

-- AlterTable
ALTER TABLE "product_variants" ADD COLUMN     "media_id" UUID;

-- CreateIndex
CREATE INDEX "product_variants_media_id_idx" ON "product_variants"("media_id");

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_media_id_fkey" FOREIGN KEY ("media_id") REFERENCES "product_media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
