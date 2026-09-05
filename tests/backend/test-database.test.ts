import { describe, expect, it } from "vitest";
import {
  getSafeTestDatabaseUrl,
  TestDatabaseSafetyError,
} from "@/lib/db/test-safety";

describe("test database guard", () => {
  it("requires a dedicated test URL", () => {
    expect(() => getSafeTestDatabaseUrl({})).toThrow(TestDatabaseSafetyError);
  });

  it("rejects a database URL without a test marker", () => {
    expect(() =>
      getSafeTestDatabaseUrl({
        TEST_DATABASE_URL: "postgresql://user:pass@localhost:5432/niuva",
      }),
    ).toThrow("marker test");
  });

  it("rejects an application and test URL that resolve to the same database", () => {
    expect(() =>
      getSafeTestDatabaseUrl({
        DATABASE_URL: "postgresql://app:pass@localhost:5432/niuva_test",
        TEST_DATABASE_URL: "postgresql://test:pass@localhost:5432/niuva_test",
      }),
    ).toThrow("database aplikasi");
  });

  it("accepts an explicitly named isolated test database", () => {
    expect(
      getSafeTestDatabaseUrl({
        DATABASE_URL: "postgresql://app:pass@localhost:5432/niuva",
        TEST_DATABASE_URL:
          "postgresql://test:pass@localhost:5432/niuva_test?schema=public",
      }),
    ).toBe("postgresql://test:pass@localhost:5432/niuva_test?schema=public");
  });
});
