import { describe, expect, it } from "vitest";

import { verifyMismatchedBinding } from "../../scripts/lib/staging-database-probe";
import { DatabaseBindingError } from "@/modules/database-binding/core";

const expected = { tier: "staging", bindingId: "07000000-0000-4000-8000-000000000003" } as const;

describe("negative staging binding probe", () => {
  it("preserves connection errors for the caller", async () => {
    const error = new Error("connection unavailable");
    const repository = { withVerifiedBinding: async () => { throw error; } };
    await expect(verifyMismatchedBinding(repository, expected)).rejects.toBe(error);
  });

  it("only accepts a marker mismatch as rejection proof", async () => {
    const mismatch = { withVerifiedBinding: async () => { throw new DatabaseBindingError("MARKER_MISMATCH"); } };
    const invalid = { withVerifiedBinding: async () => { throw new DatabaseBindingError("MARKER_INVALID"); } };
    await expect(verifyMismatchedBinding(mismatch, expected)).resolves.toBe(true);
    await expect(verifyMismatchedBinding(invalid, expected)).resolves.toBe(false);
  });
});
