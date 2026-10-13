import { describe, expect, it } from "vitest";

import { getServerCapabilities } from "@/lib/env/server";
import {
  assertDatabaseBinding,
  DatabaseBindingError,
  readDatabaseBindingExpectation,
} from "@/modules/database-binding/core";

const bindingId = "cde8a654-498f-4217-a7a1-300a2944be9e";
const otherId = "4791c3c3-ae05-42c2-a3b2-36df657430b6";
const expected = { bindingId, tier: "staging" } as const;

describe("database binding configuration", () => {
  it.each([undefined, "", "  ", "not-a-uuid"])(
    "rejects missing or malformed expected identity %s",
    (value) => {
      expect(() => readDatabaseBindingExpectation({ NIUVA_DATABASE_BINDING_ID: value }, "staging"))
        .toThrowError(DatabaseBindingError);
    },
  );

  it("normalizes a trusted server UUID and snapshots its value", () => {
    const source = { NIUVA_DATABASE_BINDING_ID: ` ${bindingId.toUpperCase()} ` };
    const result = readDatabaseBindingExpectation(source, "staging");
    source.NIUVA_DATABASE_BINDING_ID = otherId;
    expect(result).toEqual({ bindingId, tier: "staging" });
  });

  it.each([undefined, "", "bad-binding"])("does not require the new field in legacy environment parsing (%s)", (value) => {
    expect(getServerCapabilities({ NODE_ENV: "test", DATABASE_URL: "postgresql://test@localhost/niuva_test", NIUVA_DATABASE_BINDING_ID: value }).database)
      .toBe(true);
  });
});

describe("database binding comparison", () => {
  it.each(["local-test", "staging", "production"] as const)("accepts only the expected UUID and tier %s", (tier) => {
    expect(() => assertDatabaseBinding({ bindingId, tier }, { id: 1, bindingId: bindingId.toUpperCase(), tier }))
      .not.toThrow();
  });

  it.each([null, undefined])("rejects a missing marker (%s)", (row) => {
    expect(() => assertDatabaseBinding(expected, row)).toThrowError(
      expect.objectContaining({ reason: "MARKER_MISSING" }),
    );
  });

  it.each([{}, [], "private-database-value", { id: 2, bindingId, tier: "staging" }, { id: 1, bindingId: "bad", tier: "staging" }, { id: 1, bindingId, tier: "invalid" }])(
    "rejects a malformed marker %#",
    (row) => {
      expect(() => assertDatabaseBinding(expected, row)).toThrowError(
        expect.objectContaining({ reason: "MARKER_INVALID" }),
      );
    },
  );

  it.each([{ id: 1, bindingId: otherId, tier: "staging" }, { id: 1, bindingId, tier: "production" }])(
    "rejects a mismatched binding %#",
    (row) => {
      expect(() => assertDatabaseBinding(expected, row)).toThrowError(
        expect.objectContaining({ reason: "MARKER_MISMATCH" }),
      );
    },
  );

  it("does not expose invalid configuration or row content in failures", () => {
    const secretLikeValue = "postgresql://private-user:private-password@private-host/resource";
    for (const run of [
      () => readDatabaseBindingExpectation({ NIUVA_DATABASE_BINDING_ID: secretLikeValue }, "staging"),
      () => assertDatabaseBinding(expected, secretLikeValue),
    ]) {
      try {
        run();
        expect.fail("invalid binding must be rejected");
      } catch (error) {
        expect(error).toBeInstanceOf(DatabaseBindingError);
        expect(String(error)).not.toContain(secretLikeValue);
        expect(error).not.toHaveProperty("cause");
      }
    }
  });
});
