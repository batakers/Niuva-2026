import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mkdirMock, writeFileMock } = vi.hoisted(() => ({
  mkdirMock: vi.fn(),
  writeFileMock: vi.fn(),
}));

vi.mock("node:fs/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  const mocked = {
    ...actual,
    mkdir: mkdirMock,
    writeFile: writeFileMock,
  };

  return {
    ...mocked,
    default: mocked,
  };
});

import { POST } from "@/app/api/auis/brand/route";

const validBrand = {
  configured: false,
  logo: "/assets/brand/niuva.svg",
  name: "Niuva",
  tagline: "Object making studio",
};

type RequestOptions = {
  body?: string;
  headers?: Record<string, string>;
  origin?: string;
  url?: string;
};

function createRequest({
  body = JSON.stringify(validBrand),
  headers = {},
  origin,
  url = "http://127.0.0.1:3100/api/auis/brand",
}: RequestOptions = {}): Request {
  return new Request(url, {
    body,
    headers: {
      "content-type": "application/json",
      origin: origin ?? new URL(url).origin,
      ...headers,
    },
    method: "POST",
  });
}

describe("hardened AUiS brand mutation", () => {
  beforeEach(() => {
    mkdirMock.mockReset();
    writeFileMock.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("is unavailable in production before reading or writing data", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await POST(createRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      code: "LOCAL_SETUP_DISABLED",
    });
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("rejects cross-origin requests and never trusts forwarded loopback headers", async () => {
    const crossOriginResponse = await POST(
      createRequest({ origin: "http://attacker.example" }),
    );
    const forwardedResponse = await POST(
      createRequest({
        headers: { "x-forwarded-for": "127.0.0.1" },
        url: "http://192.0.2.10:3101/api/auis/brand",
      }),
    );

    expect(crossOriginResponse.status).toBe(403);
    expect(forwardedResponse.status).toBe(403);
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON and unsafe paths", async () => {
    const invalidJsonResponse = await POST(createRequest({ body: "{" }));
    const unsafePathResponse = await POST(
      createRequest({
        body: JSON.stringify({ ...validBrand, logo: "/assets/brand/../other.svg" }),
        url: "http://127.0.0.1:3102/api/auis/brand",
      }),
    );

    expect(invalidJsonResponse.status).toBe(400);
    expect(unsafePathResponse.status).toBe(422);
    expect(writeFileMock).not.toHaveBeenCalled();
  });

  it("returns a redacted internal error when local writing fails", async () => {
    writeFileMock.mockRejectedValueOnce(new Error("private disk detail"));

    const response = await POST(
      createRequest({ url: "http://127.0.0.1:3103/api/auis/brand" }),
    );

    expect(response.status).toBe(500);
    await expect(response.text()).resolves.not.toContain("private disk detail");
  });

  it("rate limits the local mutation route", async () => {
    const requestUrl = "http://127.0.0.1:3199/api/auis/brand";

    for (let requestIndex = 0; requestIndex < 10; requestIndex += 1) {
      expect((await POST(createRequest({ url: requestUrl }))).status).toBe(200);
    }

    const response = await POST(createRequest({ url: requestUrl }));

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toMatch(/^\d+$/);
    await expect(response.json()).resolves.toMatchObject({ code: "RATE_LIMITED" });
  });
});
