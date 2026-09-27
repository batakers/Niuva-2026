import { describe, expect, it } from "vitest";

import {
  assertFileTransition,
  assertVerifiedFileHasOwner,
  createRandomStorageKey,
} from "@/modules/files/lifecycle";
import { b2bInquiryInputSchema } from "@/modules/inquiry/schema";
import { customPrintRequestInputSchema } from "@/modules/custom-print/schema";
import { calculatePrintQuote } from "@/modules/pricing/calculator";
import { CUSTOM_PRINT_V1_PER_UNIT_POLICY } from "@/modules/pricing/policy";
import { assertQuoteSnapshotMutable, nextQuoteVersion } from "@/modules/quote/immutability";

describe("stored-file lifecycle", () => {
  it("uses a random object key without the customer filename", () => {
    const key = createRandomStorageKey("PRIVATE_CUSTOMER", () => "random-id");

    expect(key).toBe("private/customer/random-id");
    expect(key).not.toContain("customer-model.stl");
  });

  it("rejects invalid transitions and unowned verified files", () => {
    expect(() => assertFileTransition("PENDING", "UPLOADED")).not.toThrow();
    expect(() => assertFileTransition("UPLOADED", "VERIFIED")).not.toThrow();
    expect(() => assertFileTransition("VERIFIED", "DELETED")).not.toThrow();
    expect(() => assertFileTransition("PENDING", "VERIFIED")).toThrow();
    expect(() =>
      assertVerifiedFileHasOwner({ b2bInquiryLinks: 0, customPrintRequestLinks: 0 }),
    ).toThrow();
    expect(() =>
      assertVerifiedFileHasOwner({ b2bInquiryLinks: 1, customPrintRequestLinks: 1 }),
    ).toThrow();
    expect(() =>
      assertVerifiedFileHasOwner({ b2bInquiryLinks: 1, customPrintRequestLinks: 0 }),
    ).not.toThrow();
  });
});

describe("B2B inquiry contract", () => {
  const input = {
    confidentialityAck: true,
    currentStage: "CAD",
    description: "Prototype housing",
    email: "client@example.test",
    name: "Client",
    phone: "+628000000000",
    projectGoal: "Validate prototype",
    referenceLink: "https://example.test/reference",
    targetDeadline: "2026-10-01",
    targetQuantity: "10",
  };

  it("requires the PRD fields and a private file or reference link", () => {
    expect(b2bInquiryInputSchema.safeParse(input).success).toBe(true);
    expect(
      b2bInquiryInputSchema.safeParse({
        ...input,
        referenceLink: undefined,
      }).success,
    ).toBe(false);
    expect(
      b2bInquiryInputSchema.safeParse({
        ...input,
        attachmentFileIds: [
          "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4",
          "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4",
        ],
        referenceLink: undefined,
      }).success,
    ).toBe(false);
    expect(
      b2bInquiryInputSchema.safeParse({
        ...input,
        currentStage: "UNKNOWN",
      }).success,
    ).toBe(false);
    expect(
      b2bInquiryInputSchema.safeParse({
        ...input,
        targetDeadline: "2026-02-30",
      }).success,
    ).toBe(false);
    expect(
      b2bInquiryInputSchema.safeParse({
        ...input,
        referenceLink: "javascript:alert(1)",
      }).success,
    ).toBe(false);
    expect(
      b2bInquiryInputSchema.safeParse({
        ...input,
        currentStage: "IDEA",
        referenceLink: undefined,
      }).success,
    ).toBe(true);
    expect(b2bInquiryInputSchema.safeParse({
      ...input,
      targetDeadline: "",
    }).success).toBe(true);
    expect(b2bInquiryInputSchema.safeParse({
      ...input,
      targetDeadline: undefined,
    }).success).toBe(true);
    expect(b2bInquiryInputSchema.safeParse({
      ...input,
      preferredService: "invalid-service",
    }).success).toBe(false);
    expect(b2bInquiryInputSchema.safeParse({
      ...input,
      preferredService: "design-prototyping",
    }).success).toBe(true);
  });
});

describe("custom-print intake and pricing boundaries", () => {
  it("rejects duplicate file ownership references and accepts zero grams", () => {
    const customInput = {
      customerEmail: "client@example.test",
      customerName: "Client",
      customerPhone: "+628000000000",
      fileIds: [
        "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4",
        "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4",
      ],
      materialRequested: "PLA",
      quantity: 1,
    };

    expect(customPrintRequestInputSchema.safeParse(customInput).success).toBe(false);
    expect(() =>
      calculatePrintQuote({
        filamentSource: "NIUVA_STOCK",
        material: "PLA",
        policy: CUSTOM_PRINT_V1_PER_UNIT_POLICY,
        printDurationSeconds: 0,
        quantity: 1,
        weightGrams: "0",
      }),
    ).not.toThrow();
  });

  it("keeps legacy model mode and accepts text-only reference mode without an estimated price", () => {
    const common = {
      customerEmail: "client@example.test",
      customerName: "Client",
      customerPhone: "+628000000000",
      materialRequested: "NEEDS_RECOMMENDATION",
      quantity: 3,
    };
    const oldClient = customPrintRequestInputSchema.safeParse({
      ...common,
      fileIds: ["2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4"],
    });
    expect(oldClient.success && oldClient.data.intakeMode).toBe("MODEL_READY");
    expect(customPrintRequestInputSchema.safeParse({ ...common, fileIds: [] }).success).toBe(false);

    const reference = customPrintRequestInputSchema.safeParse({
      ...common,
      intakeMode: "REFERENCE_ONLY",
      notes: "Butuh penutup alat dari sketsa",
      referenceLink: "https://example.test/sketch",
    });
    expect(reference.success).toBe(true);
    if (reference.success) expect(reference.data.fileIds).toEqual([]);
    expect(customPrintRequestInputSchema.safeParse({
      ...common,
      intakeMode: "REFERENCE_ONLY",
      notes: "",
    }).success).toBe(false);
    expect(customPrintRequestInputSchema.safeParse({
      ...common,
      intakeMode: "REFERENCE_ONLY",
      notes: "Deskripsi",
      referenceLink: "http://example.test/sketch",
    }).success).toBe(false);
    expect(customPrintRequestInputSchema.safeParse({
      ...common,
      intakeMode: "REFERENCE_ONLY",
      notes: "Deskripsi",
      unitConfirmation: "MILLIMETER_CONFIRMED",
    }).success).toBe(false);
  });
});

describe("quote immutability", () => {
  it("allows only draft edits and creates a next version", () => {
    expect(() => assertQuoteSnapshotMutable("DRAFT")).not.toThrow();
    expect(() => assertQuoteSnapshotMutable("SENT")).toThrow();
    expect(nextQuoteVersion(null)).toBe(1);
    expect(nextQuoteVersion(3)).toBe(4);
  });
});
