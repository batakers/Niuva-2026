import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { EstimateCalculator } from "@/app/custom-print/estimate-calculator";
import { StudioRentalSection } from "@/app/custom-print/studio-rental-section";
import { createStudioBookingWhatsAppHref, studioPriceGroups } from "@/features/public/studio-rental";
import { defaultSiteInformation } from "@/modules/site-information/defaults";
import {
  calculatePublicEstimate,
  publicEstimateSearchParams,
  readPublicEstimateInput,
  readPublicEstimatePrefill,
} from "@/modules/custom-print/public-estimate";
import { readPublicEstimatePolicy } from "@/modules/custom-print/public-estimate-service";
import { calculatePrintQuote } from "@/modules/pricing/calculator";
import { CUSTOM_PRINT_V1_PER_UNIT_POLICY } from "@/modules/pricing/policy";

const policy = CUSTOM_PRINT_V1_PER_UNIT_POLICY;
const twoUnits = { material: "PLA", quantity: "2", weightGramsPerUnit: "18,4", hours: "1", minutes: "30" };

describe("public estimate", () => {
  it("prices the visitor's slicer numbers exactly like the request form simulation", () => {
    const estimate = calculatePublicEstimate(twoUnits, policy);
    const reference = calculatePrintQuote({
      filamentSource: "NIUVA_STOCK", material: "PLA", policy, printDurationSeconds: 5_400, quantity: 2, weightGrams: "18.4",
    });

    expect(estimate).toMatchObject({ material: "PLA", quantity: 2, weightGramsPerUnit: "18.4", printDurationSecondsPerUnit: 5_400 });
    expect(estimate?.finalTotalRp).toBe(reference.finalTotalRp.toFixed());
    expect(estimate?.finalTotalRp).toBe("51800");
  });

  it.each([
    ["an unknown material", { ...twoUnits, material: "PETG" }],
    ["zero quantity", { ...twoUnits, quantity: "0" }],
    ["a fractional quantity", { ...twoUnits, quantity: "1.5" }],
    ["zero weight", { ...twoUnits, weightGramsPerUnit: "0" }],
    ["text weight", { ...twoUnits, weightGramsPerUnit: "dua" }],
    ["sixty minutes", { ...twoUnits, minutes: "60" }],
    ["zero duration", { ...twoUnits, hours: "0", minutes: "0" }],
    ["negative hours", { ...twoUnits, hours: "-1" }],
  ])("refuses %s instead of guessing", (_label, input) => {
    expect(readPublicEstimateInput(input)).toBeNull();
    expect(calculatePublicEstimate(input, policy)).toBeNull();
  });

  it("carries the numbers to the request form and drops a tampered query", () => {
    const values = readPublicEstimateInput(twoUnits);
    if (values === null) throw new Error("expected valid input");
    const query = Object.fromEntries(publicEstimateSearchParams(values));

    expect(query).toEqual({ material: "PLA", quantity: "2", weight: "18.4", hours: "1", minutes: "30" });
    expect(readPublicEstimatePrefill(query)).toEqual({ material: "PLA", quantity: 2, weightGramsPerUnit: "18.4", hours: 1, minutes: 30 });
    expect(readPublicEstimatePrefill({ ...query, minutes: "90" })).toBeNull();
    expect(readPublicEstimatePrefill({ ...query, material: "<script>" })).toBeNull();
    expect(readPublicEstimatePrefill({})).toBeNull();
  });
});

describe("public estimate policy", () => {
  const rule = { id: "00000000-0000-4000-8000-000000000001", code: "CUSTOM_PRINT_V1", version: policy.version, definitionJson: policy };

  it("uses the rule only when exactly one valid per-unit rule is active", async () => {
    const repository = (rules: unknown[]) => () => ({ findActiveCustomerPreviewRules: vi.fn().mockResolvedValue(rules) });

    await expect(readPublicEstimatePolicy(repository([rule]))).resolves.toEqual(policy);
    await expect(readPublicEstimatePolicy(repository([]))).resolves.toBeNull();
    await expect(readPublicEstimatePolicy(repository([rule, rule]))).resolves.toBeNull();
    await expect(readPublicEstimatePolicy(repository([{ ...rule, version: policy.version + 1 }]))).resolves.toBeNull();
    await expect(readPublicEstimatePolicy(repository([{ ...rule, definitionJson: { code: "CUSTOM_PRINT_V1" } }]))).resolves.toBeNull();
  });

  it("stays unavailable when the database cannot be read", async () => {
    await expect(readPublicEstimatePolicy(() => { throw new Error("database offline"); })).resolves.toBeNull();
    await expect(readPublicEstimatePolicy(() => ({ findActiveCustomerPreviewRules: vi.fn().mockRejectedValue(new Error("timeout")) }))).resolves.toBeNull();
  });
});

describe("estimate calculator", () => {
  it("says it is unavailable without an active rule", () => {
    render(<EstimateCalculator policy={null} requestHref="/custom-print/request" />);

    expect(screen.getByText("Kalkulator belum tersedia saat ini.")).toBeVisible();
    expect(screen.queryByLabelText("Berat per unit (g)")).toBeNull();
  });

  it("shows the estimate as the visitor types and links to a prefilled request", () => {
    render(<EstimateCalculator policy={policy} requestHref="/custom-print/request" />);

    expect(screen.getByText("Isi berat dan durasi dari slicer untuk melihat perkiraan biaya.")).toBeVisible();
    fireEvent.change(screen.getByLabelText("Jumlah"), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText("Berat per unit (g)"), { target: { value: "18,4" } });
    fireEvent.change(screen.getByLabelText("Durasi per unit (jam)"), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText("Durasi per unit (menit)"), { target: { value: "30" } });

    expect(screen.getByText("Total perkiraan").nextElementSibling).toHaveTextContent("51.800");
    expect(screen.getByText(/Estimasi awal, bukan harga final/)).toBeVisible();
    expect(screen.getByRole("link", { name: "Ajukan model dengan angka ini" })).toHaveAttribute(
      "href", "/custom-print/request?material=PLA&quantity=2&weight=18.4&hours=1&minutes=30",
    );

    fireEvent.change(screen.getByLabelText("Durasi per unit (menit)"), { target: { value: "75" } });
    expect(screen.getByText(/Periksa angkanya/)).toBeVisible();
    expect(screen.queryByText("Total perkiraan")).toBeNull();
  });

  it("offers no request link when model requests are unavailable", () => {
    render(<EstimateCalculator policy={policy} requestHref={null} />);
    fireEvent.change(screen.getByLabelText("Berat per unit (g)"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Durasi per unit (menit)"), { target: { value: "20" } });

    expect(screen.getByText("Total perkiraan")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Ajukan model dengan angka ini" })).toBeNull();
  });
});

describe("studio rental", () => {
  it("publishes the Owner price list and books on the studio WhatsApp number", () => {
    const amounts = studioPriceGroups.flatMap(group => group.prices.map(price => price.amountRp));
    expect(amounts).toEqual([12_000, 75_000, 500_000, 5_000, 500, 0, 15_000, 35_000]);
    expect(createStudioBookingWhatsAppHref()).toMatch(/^https:\/\/wa\.me\/6281321407815\?text=/);

    render(<StudioRentalSection />);
    expect(screen.getByRole("heading", { level: 2, name: "Ingin mencetak sendiri? Datang ke studio Niuva." })).toBeVisible();
    expect(screen.getByText(defaultSiteInformation.address)).toBeVisible();
    expect(screen.getByText("Gratis")).toBeVisible();
    expect(screen.getByRole("link", { name: "Booking lewat WhatsApp" })).toHaveAttribute("href", createStudioBookingWhatsAppHref());
  });
});
