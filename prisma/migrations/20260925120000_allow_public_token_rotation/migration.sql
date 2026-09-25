-- Route-bound access token hashes are credentials, not commercial snapshots.
-- Checkout replay and operator reissue flows rotate them while preserving the
-- committed order/quote amounts and item snapshots.
CREATE OR REPLACE FUNCTION "niuva_reject_committed_snapshot_mutation"()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    IF NEW."order_type" IS DISTINCT FROM OLD."order_type"
      OR NEW."currency" IS DISTINCT FROM OLD."currency"
      OR NEW."items_subtotal_rp" IS DISTINCT FROM OLD."items_subtotal_rp"
      OR NEW."shipping_total_rp" IS DISTINCT FROM OLD."shipping_total_rp"
      OR NEW."grand_total_rp" IS DISTINCT FROM OLD."grand_total_rp" THEN
      RAISE EXCEPTION 'order commercial snapshots are immutable'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'order_items' THEN
    IF NEW."order_id" IS DISTINCT FROM OLD."order_id"
      OR NEW."variant_id" IS DISTINCT FROM OLD."variant_id"
      OR NEW."custom_quote_id" IS DISTINCT FROM OLD."custom_quote_id"
      OR NEW."item_type" IS DISTINCT FROM OLD."item_type"
      OR NEW."name_snapshot" IS DISTINCT FROM OLD."name_snapshot"
      OR NEW."sku_snapshot" IS DISTINCT FROM OLD."sku_snapshot"
      OR NEW."unit_price_rp" IS DISTINCT FROM OLD."unit_price_rp"
      OR NEW."quantity" IS DISTINCT FROM OLD."quantity"
      OR NEW."line_total_rp" IS DISTINCT FROM OLD."line_total_rp"
      OR NEW."configuration_json" IS DISTINCT FROM OLD."configuration_json" THEN
      RAISE EXCEPTION 'order item commercial snapshots are immutable'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'shipment_rate_snapshots' THEN
    RAISE EXCEPTION 'shipment rate snapshots are immutable'
      USING ERRCODE = '23514';
  ELSIF TG_TABLE_NAME = 'payment_attempts' THEN
    IF NEW."order_id" IS DISTINCT FROM OLD."order_id"
      OR NEW."purpose" IS DISTINCT FROM OLD."purpose"
      OR NEW."provider" IS DISTINCT FROM OLD."provider"
      OR NEW."provider_order_id" IS DISTINCT FROM OLD."provider_order_id"
      OR NEW."amount_rp" IS DISTINCT FROM OLD."amount_rp"
      OR NEW."expires_at" IS DISTINCT FROM OLD."expires_at"
      OR (OLD."snap_token" IS NOT NULL AND NEW."snap_token" IS DISTINCT FROM OLD."snap_token")
      OR (OLD."redirect_url" IS NOT NULL AND NEW."redirect_url" IS DISTINCT FROM OLD."redirect_url") THEN
      RAISE EXCEPTION 'payment attempt commercial snapshots are immutable'
        USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'custom_print_quotes' THEN
    IF OLD."status" = 'SENT' AND (
      NEW."request_id" IS DISTINCT FROM OLD."request_id"
      OR NEW."quote_number" IS DISTINCT FROM OLD."quote_number"
      OR NEW."version" IS DISTINCT FROM OLD."version"
      OR NEW."pricing_rule_version_id" IS DISTINCT FROM OLD."pricing_rule_version_id"
      OR NEW."verified_weight_g" IS DISTINCT FROM OLD."verified_weight_g"
      OR NEW."print_duration_seconds" IS DISTINCT FROM OLD."print_duration_seconds"
      OR NEW."material_code" IS DISTINCT FROM OLD."material_code"
      OR NEW."quantity" IS DISTINCT FROM OLD."quantity"
      OR NEW."material_subtotal_rp" IS DISTINCT FROM OLD."material_subtotal_rp"
      OR NEW."machine_subtotal_rp" IS DISTINCT FROM OLD."machine_subtotal_rp"
      OR NEW."unrounded_total_rp" IS DISTINCT FROM OLD."unrounded_total_rp"
      OR NEW."final_total_rp" IS DISTINCT FROM OLD."final_total_rp"
      OR NEW."calculation_snapshot" IS DISTINCT FROM OLD."calculation_snapshot"
      OR NEW."expires_at" IS DISTINCT FROM OLD."expires_at"
      OR NEW."created_by_admin_id" IS DISTINCT FROM OLD."created_by_admin_id"
      OR NEW."created_at" IS DISTINCT FROM OLD."created_at"
      OR NEW."sent_at" IS DISTINCT FROM OLD."sent_at"
    ) THEN
      RAISE EXCEPTION 'sent quote snapshots are immutable; create a new version'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
