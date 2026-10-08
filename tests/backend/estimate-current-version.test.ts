import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { isEstimateCurrent } from "@/modules/custom-print/estimate";
it("requires the active tariff for new work while historical issued snapshots can still be read", () => {
  const at = new Date("2026-10-08T01:00:00Z"), oldId = "123e4567-e89b-42d3-a456-426614174000", newId = "223e4567-e89b-42d3-a456-426614174000";
  const snapshot = { reviewUpdatedAt: at.toISOString(), pricingRule: { id: oldId } };
  expect(isEstimateCurrent(snapshot, at, oldId)).toBe(true); expect(isEstimateCurrent(snapshot, at, newId)).toBe(false);
  expect(isEstimateCurrent(snapshot, at)).toBe(true); expect(isEstimateCurrent(snapshot, new Date("2026-10-08T01:01:00Z"))).toBe(false);
});
