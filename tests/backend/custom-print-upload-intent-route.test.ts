import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  assertCanAppend: vi.fn(),
  createIntentForVerifiedRequestAccess: vi.fn(),
}));

vi.mock("@/modules/custom-print/access-service", () => ({
  CustomPrintAccessService: class {
    assertCanAppend = mocks.assertCanAppend;
  },
}));

vi.mock("@/modules/files/upload-service", () => ({
  UploadService: class {
    createIntentForVerifiedRequestAccess = mocks.createIntentForVerifiedRequestAccess;
  },
}));

import { POST } from "@/app/api/custom-print/requests/[token]/upload-intent/route";
import { appError } from "@/modules/shared/errors";

const payload = { mimeType: "model/stl", originalName: "model.stl", sizeBytes: 3 };

function requestFrom(ip: string, body: unknown = payload): Request {
  return new Request("https://app.example.test/api/custom-print/requests/t/upload-intent", {
    body: JSON.stringify(body),
    headers: {
      "content-type": "application/json",
      origin: "https://app.example.test",
      "x-real-ip": ip,
    },
    method: "POST",
  });
}

const context = {
  params: Promise.resolve({ token: "token" }),
} as unknown as Parameters<typeof POST>[1];

beforeEach(() => {
  mocks.assertCanAppend.mockReset().mockResolvedValue(undefined);
  mocks.createIntentForVerifiedRequestAccess.mockReset().mockResolvedValue({
    expiresAt: new Date("2026-09-05T08:10:00.000Z"),
    fileId: "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4",
    requiredHeaders: { "content-type": "model/stl" },
    uploadToken: "upload-token",
    uploadUrl: "https://storage.example.test/u",
  });
});

describe("POST /api/custom-print/requests/[token]/upload-intent", () => {
  it("issues an intent for a valid token without any Customer session", async () => {
    const response = await POST(requestFrom("10.0.17.1"), context);

    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.assertCanAppend).toHaveBeenCalledWith("token");
    expect(mocks.createIntentForVerifiedRequestAccess).toHaveBeenCalledWith(payload);
  });

  it.each(["UNAUTHORIZED", "NOT_FOUND", "CONFLICT"] as const)(
    "rejects with %s before creating any file or URL",
    async (code) => {
      mocks.assertCanAppend.mockRejectedValueOnce(appError(code));

      const response = await POST(requestFrom("10.0.17.2"), context);

      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.status).toBeLessThan(500);
      expect(mocks.createIntentForVerifiedRequestAccess).not.toHaveBeenCalled();
      expect(JSON.stringify(await response.json())).not.toContain("uploadUrl");
    },
  );

  it("limits per actor at 10 per window without blocking another actor", async () => {
    for (let i = 0; i < 10; i += 1) {
      expect((await POST(requestFrom("10.0.17.3"), context)).status).toBe(201);
    }

    expect((await POST(requestFrom("10.0.17.3"), context)).status).toBe(429);
    expect((await POST(requestFrom("10.0.17.4"), context)).status).toBe(201);
  });
});
