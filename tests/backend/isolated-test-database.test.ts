import { afterEach, expect, it, vi } from "vitest";

const databaseAccess = vi.hoisted(() => vi.fn(() => { throw new Error("database access attempted"); }));
vi.mock("@/generated/prisma/client", () => ({ PrismaClient: class { constructor() { databaseAccess(); } } }));

import { isolatedTestDatabase } from "../helpers/isolated-test-database";

afterEach(() => vi.unstubAllEnvs());

it("rejects a non-loopback test database before creating a database", async () => {
  vi.stubEnv("TEST_DATABASE_URL", "postgresql://owner:fixture@remote.example.test/niuva_test");
  await expect(isolatedTestDatabase("staging")).rejects.toThrow(/loopback/i);
  expect(databaseAccess).not.toHaveBeenCalled();
});
