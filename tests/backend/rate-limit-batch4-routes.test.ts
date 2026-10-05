import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  accept: vi.fn(),
  appendAccountModel: vi.fn(),
  claim: vi.fn(),
  decline: vi.fn(),
  request: vi.fn(),
}));

vi.mock("@/lib/auth/customer", () => ({
  getCurrentCustomer: async () => ({ id: "customer-id", email: "c@example.test" }),
  requireCustomer: async () => ({ id: "customer-id", email: "c@example.test" }),
}));

vi.mock("@/modules/customer-work/repository", () => ({
  CustomerWorkRepository: class {
    claim = mocks.claim;
    request = mocks.request;
  },
}));

vi.mock("@/modules/custom-print/access-service", () => ({
  CustomPrintAccessService: class {
    appendAccountModel = mocks.appendAccountModel;
  },
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

import { POST as postClaim } from "@/app/api/account/claim/route";
import { POST as postModel } from "@/app/api/account/make/[id]/model/route";
import { POST as postDecision } from "@/app/api/account/make/[id]/quotes/[quoteId]/decision/route";

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

const modelContext = {
  params: Promise.resolve({ id: "req-1" }),
} as unknown as Parameters<typeof postModel>[1];

const decisionContext = {
  params: Promise.resolve({ id: "req-1", quoteId: "quote-1" }),
} as unknown as Parameters<typeof postDecision>[1];

type Call = (ip: string) => Promise<Response>;

const cases: ReadonlyArray<{ call: Call; limit: number; path: string }> = [
  {
    call: (ip) =>
      postClaim(
        requestFrom("/api/account/claim", ip, { kind: "B2B_INQUIRY", token: "t".repeat(40) }),
      ),
    limit: 5,
    path: "/api/account/claim",
  },
  {
    call: (ip) => postModel(requestFrom("/api/account/make/req-1/model", ip, {}), modelContext),
    limit: 5,
    path: "/api/account/make/[id]/model",
  },
  {
    call: (ip) =>
      postDecision(
        requestFrom("/api/account/make/req-1/quotes/quote-1/decision", ip, { decision: "decline" }),
        decisionContext,
      ),
    limit: 5,
    path: "/api/account/make/[id]/quotes/[quoteId]/decision",
  },
];

beforeEach(() => {
  mocks.claim.mockReset().mockResolvedValue({ id: "w", kind: "B2B_INQUIRY", referenceNumber: "R" });
  mocks.appendAccountModel.mockReset().mockResolvedValue({ ok: true });
  mocks.request.mockReset().mockResolvedValue({ quotes: [{ id: "quote-1" }] });
  mocks.accept.mockReset().mockResolvedValue({ ok: true });
  mocks.decline.mockReset().mockResolvedValue({ ok: true });
});

describe("batch 4 public routes use a per-actor rate-limit key", () => {
  for (const { call, limit, path } of cases) {
    it(`${path}: actor A exhausting the quota does not block actor B`, async () => {
      for (let i = 0; i < limit; i += 1) {
        const ok = await call("10.0.4.1");
        expect(ok.status).toBeLessThan(400);
      }

      const limited = await call("10.0.4.1");
      expect(limited.status).toBe(429);

      const other = await call("10.0.4.2");
      expect(other.status).toBeLessThan(400);
    });
  }
});
