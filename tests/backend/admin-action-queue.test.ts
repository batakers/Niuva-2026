import { describe, expect, it } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import type { ActionQueueSignal } from "@/modules/admin/action-queue";
import { PrismaActionQueueRepository } from "@/modules/admin/action-queue-repository";
import { ActionQueueService } from "@/modules/admin/action-queue-service";

function signal(
  kind: ActionQueueSignal["kind"],
  entityId: string,
  reference: string,
  sourceUpdatedAt: string,
  workflowKey?: string,
): ActionQueueSignal {
  return {
    kind,
    entityId,
    reference,
    sourceUpdatedAt: new Date(sourceUpdatedAt),
    ...(workflowKey === undefined ? {} : { workflowKey }),
  } as ActionQueueSignal;
}

describe("ActionQueueService", () => {
  it("projects live operational signals into safe rows ordered by attention and age", async () => {
    const generatedAt = new Date("2026-09-11T08:00:00.000Z");
    const repository = {
      async listSignals(): Promise<readonly ActionQueueSignal[]> {
        return [
          signal(
            "ORDER_PROCESSING",
            "order-1",
            "ORD-PAID-1",
            "2026-09-11T07:00:00.000Z",
          ),
          signal(
            "B2B_INQUIRY",
            "inquiry-1",
            "BRF-NEW-1",
            "2026-09-11T05:00:00.000Z",
          ),
          signal(
            "SHIPPING_EXCEPTION",
            "shipment-1",
            "ORD-SHIP-1",
            "2026-09-11T07:30:00.000Z",
          ),
          signal(
            "CUSTOM_PRINT_REVIEW",
            "request-1",
            "CPR-SUB-1",
            "2026-09-11T06:00:00.000Z",
          ),
          signal(
            "QUOTE_PREPARATION",
            "request-2",
            "CPR-QUOTE-1",
            "2026-09-11T04:00:00.000Z",
            "request-2",
          ),
          signal(
            "QUOTE_SEND",
            "quote-1",
            "QTE-DRAFT-1",
            "2026-09-11T04:30:00.000Z",
            "request-2",
          ),
          signal(
            "PACKAGE_MEASUREMENT",
            "order-2",
            "ORD-QC-1",
            "2026-09-11T03:00:00.000Z",
          ),
        ];
      },
    };

    const result = await new ActionQueueService({
      now: () => generatedAt,
      repository,
    }).list();

    expect(result.generatedAt).toBe(generatedAt);
    expect(result.items.map((item) => item.kind)).toEqual([
      "SHIPPING_EXCEPTION",
      "PACKAGE_MEASUREMENT",
      "QUOTE_SEND",
      "B2B_INQUIRY",
      "CUSTOM_PRINT_REVIEW",
      "ORDER_PROCESSING",
    ]);
    expect(result.items[0]).toMatchObject({
      attention: "EXCEPTION",
      nextAction: "Tinjau exception pengiriman",
      reference: "ORD-SHIP-1",
    });
    expect(result.items[1]).toMatchObject({
      attention: "STANDARD",
      nextAction: "Ukur paket final untuk pengiriman",
    });
    expect(result.items.every((item) => !("customerEmail" in item))).toBe(true);
    expect(result.items.every((item) => !("providerPayload" in item))).toBe(true);
  });

  it("removes quote preparation when a current draft exists and caps the result", async () => {
    const signals: ActionQueueSignal[] = [
      signal(
        "QUOTE_PREPARATION",
        "request-1",
        "CPR-QUOTE-1",
        "2026-09-11T00:00:00.000Z",
        "request-1",
      ),
      signal(
        "QUOTE_SEND",
        "quote-1",
        "QTE-DRAFT-1",
        "2026-09-11T00:01:00.000Z",
        "request-1",
      ),
    ];

    for (let index = 0; index < 55; index += 1) {
      signals.push(
        signal(
          "B2B_INQUIRY",
          "inquiry-" + index,
          "BRF-" + index,
          new Date(Date.UTC(2026, 8, 11, 1, index)).toISOString(),
        ),
      );
    }

    const result = await new ActionQueueService({
      now: () => new Date("2026-09-11T08:00:00.000Z"),
      repository: {
        async listSignals() {
          return signals;
        },
      },
    }).list();

    expect(result.items).toHaveLength(50);
    expect(result.items.filter((item) => item.kind === "QUOTE_PREPARATION")).toHaveLength(0);
    expect(result.items.filter((item) => item.kind === "QUOTE_SEND")).toHaveLength(1);
  });
});

describe("PrismaActionQueueRepository", () => {
  it("reads every approved live signal with a minimal allowlisted selection", async () => {
    const calls: Array<{
      args: Record<string, unknown>;
      model: string;
    }> = [];
    let customPrintRequestCall = 0;

    const prisma = {
      b2BInquiry: {
        findMany: async (args: Record<string, unknown>) => {
          calls.push({ args, model: "b2BInquiry" });
          return [
            {
              id: "inquiry-1",
              referenceNumber: "BRF-1",
              updatedAt: new Date("2026-09-11T01:00:00.000Z"),
            },
          ];
        },
      },
      customPrintQuote: {
        findMany: async (args: Record<string, unknown>) => {
          calls.push({ args, model: "customPrintQuote" });
          return [
            {
              createdAt: new Date("2026-09-11T04:00:00.000Z"),
              id: "quote-1",
              quoteNumber: "QTE-1",
              requestId: "request-2",
            },
          ];
        },
      },
      customPrintRequest: {
        findMany: async (args: Record<string, unknown>) => {
          calls.push({ args, model: "customPrintRequest" });
          customPrintRequestCall += 1;

          return [
            {
              id: customPrintRequestCall === 1 ? "request-1" : "request-2",
              referenceNumber:
                customPrintRequestCall === 1 ? "CPR-1" : "CPR-2",
              updatedAt: new Date(
                customPrintRequestCall === 1
                  ? "2026-09-11T02:00:00.000Z"
                  : "2026-09-11T03:00:00.000Z",
              ),
            },
          ];
        },
      },
      order: {
        findMany: async (args: Record<string, unknown>) => {
          calls.push({ args, model: "order" });
          return [
            {
              id: "order-paid",
              orderNumber: "ORD-PAID",
              orderType: "RETAIL",
              status: "PAID",
              updatedAt: new Date("2026-09-11T05:00:00.000Z"),
            },
            {
              id: "order-qc",
              orderNumber: "ORD-QC",
              orderType: "CUSTOM_PRINT",
              status: "FINISHING_QC",
              updatedAt: new Date("2026-09-11T06:00:00.000Z"),
            },
          ];
        },
      },
      shipment: {
        findMany: async (args: Record<string, unknown>) => {
          calls.push({ args, model: "shipment" });
          return [
            {
              id: "shipment-1",
              order: { orderNumber: "ORD-EXCEPTION" },
              updatedAt: new Date("2026-09-11T07:00:00.000Z"),
            },
          ];
        },
      },
    } as unknown as PrismaClient;

    const signals = await new PrismaActionQueueRepository(prisma).listSignals();

    expect(signals.map((signal) => signal.kind)).toEqual([
      "B2B_INQUIRY",
      "CUSTOM_PRINT_REVIEW",
      "QUOTE_PREPARATION",
      "QUOTE_SEND",
      "ORDER_PROCESSING",
      "PACKAGE_MEASUREMENT",
      "SHIPPING_EXCEPTION",
    ]);
    expect(signals.map((signal) => signal.reference)).toEqual([
      "BRF-1",
      "CPR-1",
      "CPR-2",
      "QTE-1",
      "ORD-PAID",
      "ORD-QC",
      "ORD-EXCEPTION",
    ]);
    expect(calls).toHaveLength(6);

    for (const call of calls) {
      expect(call.args).toMatchObject({
        select: expect.any(Object),
      });
      expect(call.args.select).not.toHaveProperty("customerEmail");
      expect(call.args.select).not.toHaveProperty("customerPhone");
      expect(call.args.select).not.toHaveProperty("address");
      expect(call.args.select).not.toHaveProperty("paymentAttempts");
      expect(call.args.select).not.toHaveProperty("trackingNumber");
    }

    const quoteReadyCall = calls.find(
      (call) =>
        call.model === "customPrintRequest" &&
        JSON.stringify(call.args.where).includes("QUOTE_READY"),
    );
    expect(quoteReadyCall?.args.where).toMatchObject({
      quotes: { none: { status: "DRAFT" } },
      status: "QUOTE_READY",
    });
  });
});
