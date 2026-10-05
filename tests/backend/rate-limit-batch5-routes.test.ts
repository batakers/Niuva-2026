import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkoutCreate: vi.fn(),
  decide: vi.fn(),
}));

vi.mock("@/lib/auth/customer", () => ({
  requireCustomer: async () => ({
    displayName: "Customer",
    email: "c@example.test",
    id: "customer-id",
  }),
}));
vi.mock("@/modules/inquiry/b2b-quote", () => ({
  B2BQuoteService: class {
    decide = mocks.decide;
  },
}));
vi.mock("@/modules/checkout/service", () => ({
  CheckoutService: class {
    create = mocks.checkoutCreate;
  },
}));
vi.mock("@/modules/shipping/retail-rate-service", () => ({
  RetailShippingRateService: class {},
}));
vi.mock("@/modules/providers/runtime", () => ({
  createPaymentProviderForRuntime: () => ({}),
  createShippingProviderForRuntime: () => ({}),
}));

import { POST as postInquiryDecision } from "@/app/api/account/inquiries/[id]/quotes/[quoteId]/decision/route";
import { POST as postCheckout } from "@/app/api/checkout/route";

function requestFrom(path: string, ip: string, body: unknown): Request {
  return new Request(`https://app.example.test${path}`, {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      origin: "https://app.example.test",
      "x-real-ip": ip,
    },
    method: "POST",
  });
}

const decisionContext = {
  params: Promise.resolve({ id: "inq-1", quoteId: "quote-1" }),
} as unknown as Parameters<typeof postInquiryDecision>[1];

type Call = (ip: string) => Promise<Response>;
const cases: ReadonlyArray<{ call: Call; limit: number; path: string }> = [
  {
    call: (ip) =>
      postInquiryDecision(
        requestFrom("/api/account/inquiries/inq-1/quotes/quote-1/decision", ip, {
          decision: "DECLINED",
        }),
        decisionContext,
      ),
    limit: 5,
    path: "/api/account/inquiries/[id]/quotes/[quoteId]/decision",
  },
  {
    call: (ip) => postCheckout(requestFrom("/api/checkout", ip, { any: "payload" })),
    limit: 5,
    path: "/api/checkout",
  },
];

beforeEach(() => {
  mocks.decide.mockReset().mockResolvedValue({ ok: true });
  mocks.checkoutCreate.mockReset().mockResolvedValue({
    kind: "CREATED",
    orderAccessToken: { token: "tok" },
    orderId: "order-id",
    orderNumber: "ORD-1",
    payment: {},
    paymentAttemptId: "pa-1",
    totalRp: "1000",
  });
});

describe("batch 5 public routes use a per-actor rate-limit key", () => {
  for (const { call, limit, path } of cases) {
    it(`${path}: actor A exhausting the quota does not block actor B`, async () => {
      for (let i = 0; i < limit; i += 1) {
        const ok = await call("10.0.5.1");
        expect(ok.status).toBeLessThan(400);
      }
      const limited = await call("10.0.5.1");
      expect(limited.status).toBe(429);
      const other = await call("10.0.5.2");
      expect(other.status).toBeLessThan(400);
    });
  }
});
