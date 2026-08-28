import { beforeEach, describe, expect, it, vi } from "vitest";

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
import brandRuntime from "@/app/auis/_data/brand.runtime.json";

const brand = {
  name: brandRuntime.name,
  tagline: brandRuntime.tagline,
  logo: brandRuntime.logo,
};

function createRequest(configured?: boolean) {
  return new Request("http://localhost/api/auis/brand", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...brand, configured }),
  });
}

describe("AUiS brand route", () => {
  beforeEach(() => {
    mkdirMock.mockReset();
    writeFileMock.mockReset();
  });

  it("persists configured true when first-run setup is finalized", async () => {
    const response = await POST(createRequest(true));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, configured: true });
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining("brand.runtime.json"),
      expect.stringContaining('"configured": true'),
      "utf8",
    );
  });

  it("keeps configured false for ordinary welcome-form saves", async () => {
    const response = await POST(createRequest(false));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, configured: false });
    expect(writeFileMock).toHaveBeenCalledWith(
      expect.stringContaining("brand.runtime.json"),
      expect.stringContaining('"configured": false'),
      "utf8",
    );
  });
});
