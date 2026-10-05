import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appendModel: vi.fn(),
  preview: vi.fn(),
  submit: vi.fn(),
}));

vi.mock("@/lib/auth/customer", () => ({
  getCurrentCustomer: async () => ({ id: "customer-id", email: "c@example.test" }),
  requireCustomer: async () => ({ id: "customer-id", email: "c@example.test" }),
}));

vi.mock("@/modules/custom-print/customer-preview-service", () => ({
  CustomerPreviewService: class {
    preview = mocks.preview;
  },
}));

vi.mock("@/modules/custom-print/service", () => ({
  CustomPrintService: class {
    submit = mocks.submit;
  },
}));

vi.mock("@/modules/custom-print/customer-preview", () => ({
  readCustomerPreviewSnapshot: () => null,
}));

vi.mock("@/modules/custom-print/access-service", () => ({
  CustomPrintAccessService: class {
    appendModel = mocks.appendModel;
  },
}));

vi.mock("@/modules/notifications/resend", () => ({
  createCustomPrintAdminNotificationFromEnvironment: () => undefined,
}));

import { POST as postPreview } from "@/app/api/custom-print/preview-estimate/route";
import { POST as postRequests } from "@/app/api/custom-print/requests/route";
import { POST as postFiles } from "@/app/api/custom-print/requests/[token]/files/route";

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

const tokenContext = {
  params: Promise.resolve({ token: "token" }),
} as unknown as Parameters<typeof postFiles>[1];

type Call = (ip: string) => Promise<Response>;

const cases: ReadonlyArray<{ call: Call; limit: number; path: string }> = [
  {
    call: (ip) => postPreview(requestFrom("/api/custom-print/preview-estimate", ip)),
    limit: 15,
    path: "/api/custom-print/preview-estimate",
  },
  {
    call: (ip) => postRequests(requestFrom("/api/custom-print/requests", ip)),
    limit: 5,
    path: "/api/custom-print/requests",
  },
  {
    call: (ip) => postFiles(requestFrom("/api/custom-print/requests/token/files", ip), tokenContext),
    limit: 5,
    path: "/api/custom-print/requests/[token]/files",
  },
];

beforeEach(() => {
  mocks.preview.mockReset().mockResolvedValue({ ok: true });
  mocks.appendModel.mockReset().mockResolvedValue({ ok: true });
  mocks.submit.mockReset().mockResolvedValue({
    request: { customerPreviewSnapshot: null, id: "r", referenceNumber: "R" },
  });
});

describe("batch 3 public routes use a per-actor rate-limit key", () => {
  for (const { call, limit, path } of cases) {
    it(`${path}: actor A exhausting the quota does not block actor B`, async () => {
      for (let i = 0; i < limit; i += 1) {
        const ok = await call("10.0.3.1");
        expect(ok.status).toBeLessThan(400);
      }

      const limited = await call("10.0.3.1");
      expect(limited.status).toBe(429);

      const other = await call("10.0.3.2");
      expect(other.status).toBeLessThan(400);
    });
  }
});
