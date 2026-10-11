import { beforeEach, describe, expect, it, vi } from "vitest";
import { activeBillingSourceSchema, billingSourceSchema } from "@/modules/finance/schema";

const mocks = vi.hoisted(() => ({
  claim: vi.fn(),
  requireCustomer: vi.fn(),
}));
vi.mock("@/lib/auth/customer", () => ({ requireCustomer: mocks.requireCustomer }));
vi.mock("@/modules/customer-work/repository", () => ({
  CustomerWorkRepository: class { claim = mocks.claim; },
}));
import { POST as claimWork } from "@/app/api/account/claim/route";

const id = "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e";
beforeEach(() => {
  mocks.requireCustomer.mockResolvedValue({ id, email: "fixture@example.test" });
});

describe("active B2B boundaries", () => {
  it("keeps historical billing snapshots valid while rejecting a new B2B billing source", () => {
    const historical = { kind: "B2B", inquiryId: id };
    expect(billingSourceSchema.safeParse(historical).success).toBe(true);
    expect(activeBillingSourceSchema.safeParse(historical).success).toBe(false);
    expect(activeBillingSourceSchema.safeParse({ kind: "ORDER_TOTAL", orderId: id }).success).toBe(true);
    expect(activeBillingSourceSchema.safeParse({ kind: "CUSTOM_SHIPPING", orderId: id }).success).toBe(true);
  });

  it("does not claim a legacy inquiry into an active Customer account", async () => {
    const response = await claimWork(new Request("https://niuva.test/api/account/claim", {
      method: "POST",
      headers: { origin: "https://niuva.test", "content-type": "application/json" },
      body: JSON.stringify({ kind: "B2B_INQUIRY", token: "t".repeat(40) }),
    }));
    expect(response.status).toBe(422);
    expect(mocks.claim).not.toHaveBeenCalled();
  });
});
