import { afterEach, describe, expect, it, vi } from "vitest";

type PrismaGlobal = typeof globalThis & {
  niuvaPrismaClient?: unknown;
};

afterEach(() => {
  delete (globalThis as PrismaGlobal).niuvaPrismaClient;
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Prisma client boundary", () => {
  it("reuses one lazy Prisma client for a server instance", async () => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://test:test@localhost:5432/niuva_test",
    );
    vi.stubEnv("NODE_ENV", "test");

    const { getPrismaClient } = await import("@/lib/db/prisma");
    const firstClient = getPrismaClient();
    const secondClient = getPrismaClient();

    expect(secondClient).toBe(firstClient);
    await firstClient.$disconnect();
  });
});
