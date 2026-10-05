import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  confirmUpload: vi.fn(),
  createIntent: vi.fn(),
  getRates: vi.fn(),
}));

vi.mock("@/modules/files/upload-service", () => ({
  UploadService: class {
    confirmUpload = mocks.confirmUpload;
    createIntent = mocks.createIntent;
  },
}));

vi.mock("@/lib/auth/customer", () => ({
  getCurrentCustomer: async () => ({ id: "customer-id", email: "c@example.test" }),
  requireCustomer: async () => ({ id: "customer-id", email: "c@example.test" }),
}));

vi.mock("@/modules/providers/runtime", () => ({
  createShippingProviderForRuntime: () => ({ getRates: vi.fn() }),
}));

vi.mock("@/modules/shipping/retail-rate-service", () => ({
  RetailShippingRateService: class {
    getRates = mocks.getRates;
  },
}));

import { POST as postShippingRates } from "@/app/api/shipping/rates/route";
import { POST as postUploadConfirmation } from "@/app/api/uploads/confirm/route";
import { POST as postUploadIntent } from "@/app/api/uploads/intents/route";

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

beforeEach(() => {
  mocks.confirmUpload.mockReset().mockResolvedValue({ fileId: "f", status: "UPLOADED" });
  mocks.createIntent.mockReset().mockResolvedValue({
    expiresAt: new Date("2026-09-05T08:10:00.000Z"),
    fileId: "f",
    requiredHeaders: {},
    uploadToken: "t",
    uploadUrl: "https://storage.example.test/u",
  });
  mocks.getRates.mockReset().mockResolvedValue({
    expiresAt: new Date("2026-09-05T09:05:00.000Z"),
    options: [],
  });
});

const cases = [
  { handler: postUploadIntent, limit: 10, path: "/api/uploads/intents" },
  { handler: postUploadConfirmation, limit: 20, path: "/api/uploads/confirm" },
  { handler: postShippingRates, limit: 10, path: "/api/shipping/rates" },
] as const;

describe("batch 1 public routes use a per-actor rate-limit key", () => {
  for (const { handler, limit, path } of cases) {
    it(`${path}: actor A exhausting the quota does not block actor B`, async () => {
      for (let i = 0; i < limit; i += 1) {
        const ok = await handler(requestFrom(path, "10.0.0.1"));
        expect(ok.status).toBeLessThan(400);
      }

      const limited = await handler(requestFrom(path, "10.0.0.1"));
      expect(limited.status).toBe(429);

      const other = await handler(requestFrom(path, "10.0.0.2"));
      expect(other.status).toBeLessThan(400);
    });
  }
});
