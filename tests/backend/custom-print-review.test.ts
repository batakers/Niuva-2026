import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import type { AdminAccess } from "@/lib/auth/clerk";
import {
  CustomPrintService,
  type CustomPrintServiceRepository,
} from "@/modules/custom-print/service";
import type { CustomPrintReviewInput } from "@/modules/custom-print/repository";
import type { DomainAuditEvent } from "@/modules/shared/audit";

const owner: AdminAccess = {
  clerkUserId: "user_owner",
  profile: {
    clerkUserId: "user_owner",
    id: "a6258b47-9d35-4a76-95c4-f8266c62069a",
    isActive: true,
    role: "OWNER",
  },
};

describe("custom print slicer review write", () => {
  it("persists Owner review and advances a submitted request to Quote Ready", async () => {
    const requestId = "2773cf03-7d66-4cea-b743-96f4eaaa939c";
    let currentStatus: "SUBMITTED" | "UNDER_REVIEW" | "QUOTE_READY" = "SUBMITTED";
    let savedReview: CustomPrintReviewInput | undefined;
    const events: DomainAuditEvent[] = [];
    const repository: CustomPrintServiceRepository = {
      async create() {
        return { id: "request-1", referenceNumber: "CPR-TEST" };
      },
      async findRequestForReview() {
        return { id: requestId, quantity: 1, status: currentStatus };
      },
      async findUploadReadyFileIds() {
        return [];
      },
      async referenceExists() {
        return false;
      },
      async saveReview(input) {
        savedReview = input;
      },
      async updateStatusIfCurrent(_requestId, expectedStatus, nextStatus) {
        if (currentStatus !== expectedStatus) return null;
        if (
          nextStatus !== "SUBMITTED" &&
          nextStatus !== "UNDER_REVIEW" &&
          nextStatus !== "QUOTE_READY"
        ) {
          return null;
        }
        currentStatus = nextStatus;
        return { id: requestId, status: nextStatus };
      },
    };
    const service = new CustomPrintService({
      audit: (event) => {
        events.push(event);
      },
      authorizeAdmin: async () => owner,
      repository,
    });

    const result = await service.recordReview({
      configurationJson: { fixture: true },
      materialCode: "PLA",
      notes: "Acceptance review",
      printDurationSeconds: 900,
      quantity: 1,
      requestId,
      verifiedWeightG: "12.5",
    });

    expect(result.verifiedWeightG).toEqual(new Decimal("12.5"));
    expect(savedReview).toMatchObject({
      materialCode: "PLA",
      notes: "Acceptance review",
      printDurationSeconds: 900,
      quantity: 1,
      requestId,
    });
    expect(currentStatus).toBe("QUOTE_READY");
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ action: "custom-print.review.completed" }),
        expect.objectContaining({ action: "state.transition" }),
      ]),
    );
  });
});
