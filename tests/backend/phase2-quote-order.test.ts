import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";

import type { AdminAccess } from "@/lib/auth/clerk";
import { issueAccessToken } from "@/modules/shared/access-token";
import type { QuoteForAcceptance } from "@/modules/custom-print/repository";
import { CUSTOM_PRINT_V1_PER_UNIT_POLICY } from "@/modules/pricing/policy";
import { QuoteService, type QuoteServiceRepository } from "@/modules/quote/service";
import type { OrderStatusRepository } from "@/modules/order/status-service";
import { OrderStatusService } from "@/modules/order/status-service";

const quoteId = "7a0f083f-58e2-4cbd-9fc4-8e8c88f09a81";
const requestId = "f9c2a8b2-22cd-4e7a-9b3f-0c42d5a7b993";
const orderId = "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4";
const now = new Date("2026-09-04T00:00:00.000Z");
const admin: AdminAccess = {
  clerkUserId: "user_admin",
  profile: {
    clerkUserId: "user_admin",
    id: "a6f443d8-3e8a-49b5-81d0-94d56e06c208",
    isActive: true,
    role: "ADMIN",
  },
};
const activePricingRule = {
  code: "CUSTOM_PRINT_V1",
  definitionJson: CUSTOM_PRINT_V1_PER_UNIT_POLICY,
  id: "a1d6380a-20fd-4aaf-9d90-31d8ae7001d2",
  version: 1,
};

function auditRecorder() {
  const events: unknown[] = [];
  const record = (event: unknown): void => {
    events.push(event);
  };
  return { events, record };
}

function quoteForAcceptance(tokenHash: string, expiresAt: Date): QuoteForAcceptance {
  return {
    calculationSnapshot: {
      filamentSource: "NIUVA_STOCK",
      material: "PLA",
      policy: CUSTOM_PRINT_V1_PER_UNIT_POLICY,
      printDurationSeconds: 3_600,
      pricingRule: {
        code: "CUSTOM_PRINT_V1",
        version: 1,
      },
      quantity: 1,
      weightGrams: "50",
    },
    expiresAt,
    finalTotalRp: new Decimal("55000"),
    id: quoteId,
    machineSubtotalRp: new Decimal("5000"),
    materialCode: "PLA",
    materialSubtotalRp: new Decimal("50000"),
    printDurationSeconds: 3_600,
    publicTokenHash: tokenHash,
    quantity: 1,
    request: {
      customerEmail: "client@example.test",
      customerName: "Client",
      customerPhone: "+628000000000",
    },
    requestId,
    status: "SENT",
    unroundedTotalRp: new Decimal("55000"),
    verifiedWeightG: new Decimal("50"),
    version: 1,
  };
}

describe("Phase 2 quote acceptance", () => {
  it("issues the public token and seven-day expiry only when the draft is sent", async () => {
    const audit = auditRecorder();
    const placeholder = issueAccessToken({
      entityId: quoteId,
      randomBytes: (size) => new Uint8Array(size).fill(2),
      scope: "CUSTOM_PRINT_QUOTE",
    });
    let persistedExpiry: Date | undefined;
    let persistedTokenHash: string | undefined;
    const repository: QuoteServiceRepository = {
      async acceptAndCreatePayableOrder() {
        throw new Error("unused");
      },
      async createDraft() {
        throw new Error("unused");
      },
      async findForAcceptance() {
        return {
          ...quoteForAcceptance(placeholder.tokenHash, new Date("2026-09-05T00:00:00.000Z")),
          expiresAt: null,
          status: "DRAFT" as const,
        };
      },
      async findActivePricingRuleVersion() {
        return activePricingRule;
      },
      async findLatestVersion() {
        return 1;
      },
      async findRequestForReview() {
        return null;
      },
      async findReview() {
        return null;
      },
      async orderNumberExists() {
        return false;
      },
      async quoteNumberExists() {
        return false;
      },
      async sendIfCurrent(_id, _sentAt, expiresAt, publicTokenHash) {
        persistedExpiry = expiresAt;
        persistedTokenHash = publicTokenHash;
        return { id: quoteId, requestId, status: "SENT" as const };
      },
      async updateStatusIfCurrent() {
        return null;
      },
    };
    const service = new QuoteService({
      audit: audit.record,
      authorizeAdmin: async () => admin,
      now: () => now,
      randomBytes: (size) => new Uint8Array(size).fill(9),
      repository,
    });

    const sent = await service.send(quoteId);

    expect(sent.accessToken.expiresAt?.toISOString()).toBe(
      "2026-09-11T00:00:00.000Z",
    );
    expect(persistedExpiry).toEqual(sent.accessToken.expiresAt);
    expect(persistedTokenHash).toBe(sent.accessToken.tokenHash);
    expect(sent.accessToken.tokenHash).not.toBe(placeholder.tokenHash);
    expect(audit.events.at(-1)).toMatchObject({ action: "quote.sent" });
  });

  it("revalidates the immutable snapshot and creates one payable custom order", async () => {
    const quoteToken = issueAccessToken({
      entityId: quoteId,
      expiresAt: new Date("2026-09-04T01:00:00.000Z"),
      now,
      randomBytes: (size) => new Uint8Array(size).fill(4),
      scope: "CUSTOM_PRINT_QUOTE",
    });
    const acceptedInputs: string[] = [];
    const audit = auditRecorder();
    const repository: QuoteServiceRepository = {
      async acceptAndCreatePayableOrder(input) {
        acceptedInputs.push(input.orderId);
        return {
          kind: "CREATED",
          orderId: input.orderId,
          orderNumber: input.orderNumber,
        };
      },
      async createDraft() {
        return { id: quoteId, quoteNumber: "QUO-1", status: "DRAFT" as const };
      },
      async findForAcceptance() {
        return quoteForAcceptance(
          quoteToken.tokenHash,
          new Date("2026-09-04T01:00:00.000Z"),
        );
      },
      async findActivePricingRuleVersion() {
        return activePricingRule;
      },
      async findLatestVersion() {
        return 1;
      },
      async findRequestForReview() {
        return { id: requestId, quantity: 1, status: "QUOTE_READY" as const };
      },
      async findReview() {
        return null;
      },
      async orderNumberExists() {
        return false;
      },
      async quoteNumberExists() {
        return false;
      },
      async sendIfCurrent() {
        return { id: quoteId, requestId, status: "SENT" as const };
      },
      async updateStatusIfCurrent() {
        return { id: quoteId, status: "EXPIRED" as const };
      },
    };
    const service = new QuoteService({
      audit: audit.record,
      now: () => now,
      randomBytes: (size) => new Uint8Array(size).fill(5),
      repository,
    });

    const result = await service.accept({
      now,
      quoteId,
      token: quoteToken.token,
    });

    expect(result.kind).toBe("CREATED");
    expect(result.orderId).toBe(acceptedInputs[0]);
    expect(result.orderAccessToken?.scope).toBe("ORDER_STATUS");
    expect(audit.events.at(-1)).toMatchObject({
      action: "quote.accepted",
      entityId: quoteId,
    });
  });

  it("rejects a token at the stored quote expiry before any order mutation", async () => {
    const expiresAt = new Date("2026-09-04T01:00:00.000Z");
    const quoteToken = issueAccessToken({
      entityId: quoteId,
      expiresAt,
      now,
      randomBytes: (size) => new Uint8Array(size).fill(4),
      scope: "CUSTOM_PRINT_QUOTE",
    });
    let mutationCalls = 0;
    const repository: QuoteServiceRepository = {
      async acceptAndCreatePayableOrder() {
        mutationCalls += 1;
        throw new Error("must not mutate");
      },
      async createDraft() {
        throw new Error("unused");
      },
      async findForAcceptance() {
        return quoteForAcceptance(quoteToken.tokenHash, expiresAt);
      },
      async findActivePricingRuleVersion() {
        return activePricingRule;
      },
      async findLatestVersion() {
        return 1;
      },
      async findRequestForReview() {
        return null;
      },
      async findReview() {
        return null;
      },
      async orderNumberExists() {
        return false;
      },
      async quoteNumberExists() {
        return false;
      },
      async sendIfCurrent() {
        return null;
      },
      async updateStatusIfCurrent() {
        return null;
      },
    };
    const service = new QuoteService({ now: () => now, repository });

    await expect(
      service.accept({ now: expiresAt, quoteId, token: quoteToken.token }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(mutationCalls).toBe(0);
  });
});

describe("Phase 2 public order status", () => {
  it("returns only the safe token-authorized projection", async () => {
    const orderToken = issueAccessToken({
      entityId: orderId,
      randomBytes: (size) => new Uint8Array(size).fill(8),
      scope: "ORDER_STATUS",
    });
    const repository: OrderStatusRepository = {
      async findForPublicStatusById() {
        return {
          completedAt: null,
          createdAt: now,
          items: [{ lineTotalRp: new Decimal("12500"), nameSnapshot: "Lamp", quantity: 1 }],
          orderNumber: "ORD-20260904-ABCDEFGH",
          orderType: "RETAIL",
          paidAt: null,
          publicTokenHash: orderToken.tokenHash,
          shipments: [],
          status: "PENDING_PAYMENT",
        };
      },
      async findStatusForMutation() {
        return null;
      },
      async updateStatusIfCurrent() {
        return null;
      },
    };
    const service = new OrderStatusService({ repository });

    const result = await service.getPublicStatus({
      orderId,
      token: orderToken.token,
      now,
    });

    expect(result).toEqual({
      completedAt: null,
      createdAt: now,
      items: [{ lineTotalRp: new Decimal("12500"), nameSnapshot: "Lamp", quantity: 1 }],
      orderNumber: "ORD-20260904-ABCDEFGH",
      orderType: "RETAIL",
      paidAt: null,
      shipments: [],
      status: "PENDING_PAYMENT",
    });
    expect(result).not.toHaveProperty("publicTokenHash");
  });
});
