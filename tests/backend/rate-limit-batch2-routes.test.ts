import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  accept: vi.fn(),
  decline: vi.fn(),
  submit: vi.fn(),
}));

vi.mock("@/lib/auth/customer", () => ({
  requireCustomer: async () => ({ id: "customer-id", email: "c@example.test" }),
}));

vi.mock("@/modules/inquiry/service", () => ({
  InquiryService: class {
    submit = mocks.submit;
  },
}));

vi.mock("@/modules/notifications/resend", () => ({
  createInquiryAdminNotificationFromEnvironment: () => undefined,
}));

vi.mock("@/modules/quote/service", () => ({
  QuoteService: class {
    accept = mocks.accept;
    decline = mocks.decline;
  },
}));

vi.mock("@/modules/providers/runtime", () => ({
  createPaymentProviderForRuntime: () => ({}),
}));

vi.mock("@/modules/shared/access-token", () => ({
  getRouteAccessTokenEntityId: () => "quote-id",
}));

import { POST as postProjectBrief } from "@/app/api/project-brief/route";
import { POST as postQuoteAccept } from "@/app/api/quote/[token]/accept/route";
import { POST as postQuoteDecline } from "@/app/api/quote/[token]/decline/route";

function requestFrom(path: string, ip: string): Request {
  return new Request(`https://app.example.test${path}`, {
    body: JSON.stringify({}),
    headers: {
      "content-type": "application/json",
      origin: "https://app.example.test",
      "x-real-ip": ip,
    },
    method: "POST",
  });
}

const tokenContext = { params: Promise.resolve({ token: "token" }) };

type Call = (ip: string) => Promise<Response>;

const cases: ReadonlyArray<{ call: Call; limit: number; path: string }> = [
  {
    call: (ip) => postQuoteAccept(requestFrom("/api/quote/token/accept", ip), tokenContext),
    limit: 5,
    path: "/api/quote/[token]/accept",
  },
  {
    call: (ip) => postQuoteDecline(requestFrom("/api/quote/token/decline", ip), tokenContext),
    limit: 5,
    path: "/api/quote/[token]/decline",
  },
  {
    call: (ip) => postProjectBrief(requestFrom("/api/project-brief", ip)),
    limit: 5,
    path: "/api/project-brief",
  },
];

beforeEach(() => {
  mocks.accept.mockReset().mockResolvedValue({
    kind: "CREATED",
    orderId: "o",
    orderNumber: "N",
    status: "PENDING",
    totalRp: "1",
  });
  mocks.decline.mockReset().mockResolvedValue({ id: "quote-id", status: "DECLINED" });
  mocks.submit.mockReset().mockResolvedValue({
    inquiry: { id: "i", referenceNumber: "R" },
  });
});

describe("batch 2 public routes use a per-actor rate-limit key", () => {
  for (const { call, limit, path } of cases) {
    it(`${path}: actor A exhausting the quota does not block actor B`, async () => {
      for (let i = 0; i < limit; i += 1) {
        const ok = await call("10.0.1.1");
        expect(ok.status).toBeLessThan(400);
      }

      const limited = await call("10.0.1.1");
      expect(limited.status).toBe(429);

      const other = await call("10.0.1.2");
      expect(other.status).toBeLessThan(400);
    });
  }

  it("quote accept and decline buckets are independent per endpointId", async () => {
    const ip = "10.0.2.1";
    const [accept, decline] = cases;

    for (let i = 0; i < 5; i += 1) {
      expect((await accept.call(ip)).status).toBeLessThan(400);
    }
    expect((await accept.call(ip)).status).toBe(429);

    // Same actor, other endpoint: its own untouched quota.
    for (let i = 0; i < 5; i += 1) {
      expect((await decline.call(ip)).status).toBeLessThan(400);
    }
    expect((await decline.call(ip)).status).toBe(429);
  });
});
