CREATE TYPE "StockMovementKind" AS ENUM (
  'OPENING_BALANCE',
  'CATALOG_IMPORT',
  'MANUAL_ADJUSTMENT',
  'ORDER_CONSUMPTION'
);

CREATE TABLE "stock_movements" (
  "id" UUID NOT NULL,
  "variant_id" UUID NOT NULL,
  "kind" "StockMovementKind" NOT NULL,
  "delta" INTEGER NOT NULL,
  "balance_before" INTEGER NOT NULL,
  "balance_after" INTEGER NOT NULL,
  "admin_id" UUID,
  "reason" TEXT,
  "order_id" UUID,
  "reservation_id" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_movements_balance_check" CHECK (
    "balance_before" >= 0
    AND "balance_after" >= 0
    AND "balance_before" + "delta" = "balance_after"
  ),
  CONSTRAINT "stock_movements_source_check" CHECK (
    ("kind" = 'MANUAL_ADJUSTMENT' AND "admin_id" IS NOT NULL AND NULLIF(BTRIM("reason"), '') IS NOT NULL AND "order_id" IS NULL AND "reservation_id" IS NULL AND "delta" <> 0)
    OR ("kind" = 'ORDER_CONSUMPTION' AND "order_id" IS NOT NULL AND "reservation_id" IS NOT NULL AND "delta" < 0)
    OR ("kind" IN ('OPENING_BALANCE', 'CATALOG_IMPORT') AND "order_id" IS NULL AND "reservation_id" IS NULL)
  )
);

CREATE UNIQUE INDEX "stock_movements_reservation_id_key" ON "stock_movements"("reservation_id");
CREATE UNIQUE INDEX "stock_movements_one_opening_per_variant" ON "stock_movements"("variant_id") WHERE "kind" = 'OPENING_BALANCE';
CREATE INDEX "stock_movements_variant_id_created_at_id_idx" ON "stock_movements"("variant_id", "created_at", "id");
CREATE INDEX "stock_movements_order_id_idx" ON "stock_movements"("order_id");

ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_reservation_id_fkey" FOREIGN KEY ("reservation_id") REFERENCES "stock_reservations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The earlier sequence of stock changes cannot be reconstructed reliably.
-- This is an opening balance at migration time, including zero-stock variants.
INSERT INTO "stock_movements" (
  "id", "variant_id", "kind", "delta", "balance_before", "balance_after", "created_at"
)
SELECT gen_random_uuid(), "id", 'OPENING_BALANCE'::"StockMovementKind", "stock_on_hand", 0, "stock_on_hand", CURRENT_TIMESTAMP
FROM "product_variants";
