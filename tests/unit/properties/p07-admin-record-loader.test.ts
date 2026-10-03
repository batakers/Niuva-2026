import { notFound, redirect } from "next/navigation";
import { describe, expect, it } from "vitest";

import {
  loadAdminRecord,
  type AdminRecordResult,
} from "@/app/admin/admin-record-loader";
import { AppError, ERROR_CODES } from "@/modules/shared/errors";

// Feature: system-pages-and-error-states, Property 7
// Property 7: Loader results are exclusive and exhaustive.
// The read() outcome space is finite, so it is enumerated exhaustively
// instead of sampled (no property-testing dependency is installed).
// **Validates: Requirements 8.1, 8.2, 8.3**

type Expected = "found" | "not-found" | "unavailable";

type Outcome = {
  label: string;
  expected: Expected;
  read: () => Promise<unknown>;
  record?: unknown;
};

const falsyAndNonNullValues: unknown[] = [
  0,
  "",
  {},
  [],
  false,
  NaN,
  undefined,
  BigInt(0),
  "value",
  42,
  { id: "abc" },
];

const outcomes: Outcome[] = [
  ...falsyAndNonNullValues.map(
    (value): Outcome => ({
      label: `resolves non-null ${typeof value} ${
        typeof value === "object" ? JSON.stringify(value) : String(value)
      }`,
      expected: "found",
      read: () => Promise.resolve(value),
      record: value,
    }),
  ),
  {
    label: "resolves null",
    expected: "not-found",
    read: () => Promise.resolve(null),
  },
  ...ERROR_CODES.map(
    (code): Outcome => ({
      label: `throws AppError ${code}`,
      expected: code === "NOT_FOUND" ? "not-found" : "unavailable",
      read: () => Promise.reject(new AppError(code)),
    }),
  ),
  {
    label: "throws plain Error",
    expected: "unavailable",
    read: () => Promise.reject(new Error("boom")),
  },
  {
    label: "throws TypeError",
    expected: "unavailable",
    read: () => Promise.reject(new TypeError("bad")),
  },
  ...[
    ["string", "boom"],
    ["number", 500],
    ["undefined", undefined],
    ["null", null],
    ["plain object", { code: "NOT_FOUND" }],
    ["object with NOT_FOUND code (not an AppError)", { code: "NOT_FOUND", status: 404 }],
  ].map(
    ([name, value]): Outcome => ({
      label: `throws non-Error ${String(name)}`,
      expected: "unavailable",
      read: () => Promise.reject(value),
    }),
  ),
  {
    label: "read() throws synchronously (plain Error)",
    expected: "unavailable",
    read: () => {
      throw new Error("sync boom");
    },
  },
];

function statusOf(result: AdminRecordResult<unknown>): Expected {
  return result.status;
}

describe("Property 7: loadAdminRecord results are exclusive and exhaustive", () => {
  it("covers every ERROR_CODE", () => {
    const covered = outcomes.filter((o) => o.label.startsWith("throws AppError"));
    expect(covered).toHaveLength(ERROR_CODES.length);
  });

  it.each(outcomes.map((o) => [o.label, o] as const))(
    "%s never throws and maps to the exact status",
    async (_label, outcome) => {
      const result = await loadAdminRecord(outcome.read);

      expect(statusOf(result)).toBe(outcome.expected);

      // Exclusive: exactly one of the three statuses.
      expect(["found", "not-found", "unavailable"]).toContain(result.status);

      // `record` is present only on `found`.
      if (result.status === "found") {
        expect(Object.is(result.record, outcome.record)).toBe(true);
      } else {
        expect("record" in result).toBe(false);
      }
    },
  );

  it("is found iff non-null, not-found iff null or NOT_FOUND, unavailable otherwise", async () => {
    for (const outcome of outcomes) {
      const result = await loadAdminRecord(outcome.read);
      const isNonNull = outcome.expected === "found";
      expect(result.status === "found").toBe(isNonNull);
      expect(result.status === "not-found").toBe(outcome.expected === "not-found");
      expect(result.status === "unavailable").toBe(outcome.expected === "unavailable");
    }
  });

  it("rethrows Next.js redirect() control-flow errors instead of swallowing them", async () => {
    await expect(
      loadAdminRecord(async () => redirect("/admin/sign-in")),
    ).rejects.toMatchObject({
      digest: expect.stringContaining("NEXT_REDIRECT"),
    });
  });

  it("rethrows Next.js notFound() control-flow errors instead of mapping them", async () => {
    await expect(
      loadAdminRecord(async () => notFound()),
    ).rejects.toMatchObject({
      digest: expect.stringContaining("404"),
    });
  });
});
