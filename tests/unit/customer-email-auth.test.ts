import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/modules/customer-auth/password";
import { registrationSchema, passwordSchema } from "@/modules/customer-auth/password-validation";
import { isCustomerEmailTestRuntime } from "@/modules/customer-auth/email-test-runtime";
describe("Customer email authentication primitives", () => {
  it("salts scrypt hashes and verifies full passwords including spaces", async () => {
    const password = "a sufficiently long passphrase";
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).not.toBe(second);
    expect(first).not.toContain(password);
    expect(await verifyPassword(password, first)).toBe(true);
    expect(await verifyPassword(password + " ", first)).toBe(false);
    expect(await verifyPassword(password, "malformed")).toBe(false);
  }, 10000);
  it("reports a saturated hashing pool as RESOURCE_BUSY, not RATE_LIMITED", async () => {
    const results = await Promise.allSettled([hashPassword("one"), hashPassword("two"), hashPassword("three")]);
    const rejected = results.filter((result): result is PromiseRejectedResult => result.status === "rejected");
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(2);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ code: "RESOURCE_BUSY", status: 503 });
    expect(rejected[0].reason).not.toMatchObject({ code: "RATE_LIMITED" });
  }, 20000);
  it("accepts passphrases without forced numbers/uppercase and enforces length", () => {
    expect(passwordSchema.safeParse("a long lowercase phrase").success).toBe(true);
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("x".repeat(129)).success).toBe(false);
  });
  it("requires matching confirmation and consent at the server schema", () => {
    const data = { name: "Test Customer", email: "test@example.test", password: "a long lowercase phrase", confirmPassword: "a long lowercase phrase", consent: "on" };
    expect(registrationSchema.safeParse(data).success).toBe(true);
    expect(registrationSchema.safeParse({ ...data, consent: undefined }).success).toBe(false);
    expect(registrationSchema.safeParse({ ...data, confirmPassword: "different" }).success).toBe(false);
  });
  it("allows fixtures only for explicit test mode and loopback test database", () => {
    const input = { NODE_ENV: "test", NIUVA_CUSTOMER_AUTH_MOCK: "true", DATABASE_URL: "postgresql://niuva_test@localhost:55432/niuva_test" };
    expect(isCustomerEmailTestRuntime(input)).toBe(true);
    expect(isCustomerEmailTestRuntime({ ...input, NODE_ENV: "development" })).toBe(false);
    expect(isCustomerEmailTestRuntime({ ...input, DATABASE_URL: "postgresql://niuva_dev@localhost/niuva_dev" })).toBe(false);
    expect(isCustomerEmailTestRuntime({ ...input, DATABASE_URL: "postgresql://user@remote.test/niuva_test" })).toBe(false);
  });
});
