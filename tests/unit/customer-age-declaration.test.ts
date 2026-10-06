import { describe, expect, it } from "vitest";
import { registrationSchema } from "@/modules/customer-auth/password-validation";

const registration = {
  name: "Adult Fixture",
  email: "adult@example.test",
  password: "a sufficiently long passphrase",
  confirmPassword: "a sufficiently long passphrase",
  consent: "on",
};

describe("Customer age declaration at the registration boundary", () => {
  it.each([undefined, "off", "false", true, false, 18, ["on"]])(
    "rejects a missing or non-explicit declaration: %j",
    (ageDeclaration) => {
      const result = registrationSchema.safeParse({ ...registration, ageDeclaration });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((issue) => issue.path[0] === "ageDeclaration")).toBe(true);
      }
    },
  );

  it("accepts an explicit declaration independently from policy consent", () => {
    expect(registrationSchema.safeParse({ ...registration, ageDeclaration: "on" }).success).toBe(true);
    expect(registrationSchema.safeParse({ ...registration, consent: undefined, ageDeclaration: "on" }).success).toBe(false);
  });
});
