import { describe, expect, it } from "vitest";

import {
  customRequestStatusLabel,
  orderStatusLabel,
  paymentStatusLabel,
  quoteStatusLabel,
  shipmentStatusLabel,
} from "@/features/customer-status/labels";
import {
  CustomPrintQuoteStatus,
  CustomPrintRequestStatus,
  OrderStatus,
  PaymentAttemptStatus,
  ShipmentStatus,
} from "@/generated/prisma/enums";
import { formatGrams, formatPrintDuration, formatRupiah } from "@/modules/shared/format";

const normalize = (value: string) => value.replace(/\s/g, " ");

describe("shared money and measurement formatting", () => {
  it("formats whole rupiah from strings, stored padding, and bigint", () => {
    expect(normalize(formatRupiah("77500"))).toBe("Rp 77.500");
    expect(normalize(formatRupiah("25000.000000"))).toBe("Rp 25.000");
    expect(normalize(formatRupiah(BigInt(1250000)))).toBe("Rp 1.250.000");
  });

  it("shows a real fraction as stored instead of rounding it", () => {
    expect(formatRupiah("2500.5")).toBe("Rp 2500.5");
    expect(formatRupiah("bukan angka")).toBe("Rp bukan angka");
  });

  it("trims gram padding and writes durations in hours and minutes", () => {
    expect(formatGrams("128.400000")).toBe("128,4");
    expect(formatGrams("12")).toBe("12");
    expect(formatPrintDuration(900)).toBe("15 menit");
    expect(formatPrintDuration(4_380)).toBe("1 jam 13 menit");
    expect(formatPrintDuration(7_200)).toBe("2 jam");
  });
});

describe("Customer status labels", () => {
  it("names every stored status without the raw enum or the word order", () => {
    const labels = [
      ...Object.values(OrderStatus).flatMap((status) => [orderStatusLabel(status, false), orderStatusLabel(status, true)]),
      ...Object.values(CustomPrintRequestStatus).map(customRequestStatusLabel),
      ...Object.values(CustomPrintQuoteStatus).map(quoteStatusLabel),
      ...Object.values(PaymentAttemptStatus).map(paymentStatusLabel),
      ...Object.values(ShipmentStatus).map(shipmentStatusLabel),
    ];
    for (const label of labels) {
      expect(label).not.toMatch(/^[A-Z_]+$/);
      expect(label).not.toMatch(/\border\b/i);
    }
  });

  it("keeps an unknown projected shipment status readable", () => {
    expect(shipmentStatusLabel("IN_TRANSIT")).toBe("IN_TRANSIT");
    expect(shipmentStatusLabel("SHIPPED")).toBe("Dalam pengiriman");
  });
});
