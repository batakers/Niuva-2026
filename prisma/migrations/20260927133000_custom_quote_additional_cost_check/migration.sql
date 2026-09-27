-- Preserve every existing quote. The old check counted only material and
-- machine; additional assessed production costs are now included before the
-- same final-total rounding rule is applied.
ALTER TABLE "custom_print_quotes" DROP CONSTRAINT "custom_print_quotes_calculation_check";
ALTER TABLE "custom_print_quotes" ADD CONSTRAINT "custom_print_quotes_calculation_check" CHECK (
  "version" > 0
  AND "verified_weight_g" >= 0
  AND "print_duration_seconds" >= 0
  AND "quantity" > 0
  AND "material_subtotal_rp" >= 0
  AND "machine_subtotal_rp" >= 0
  AND "additional_subtotal_rp" >= 0
  AND "unrounded_total_rp" = "material_subtotal_rp" + "machine_subtotal_rp" + "additional_subtotal_rp"
  AND "final_total_rp" = round("unrounded_total_rp", 0)
);
