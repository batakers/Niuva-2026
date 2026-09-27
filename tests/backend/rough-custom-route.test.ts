import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ customerId: "", checkRates: vi.fn() }));
vi.mock("@/lib/auth/customer", () => ({
  requireCustomer: async () => ({ id: mocks.customerId, email: "customer@example.test" }),
}));
vi.mock("@/modules/shipping/rough-custom", () => ({
  RoughCustomShippingService: class { checkRates = mocks.checkRates; },
}));

import { POST } from "@/app/api/account/make/[id]/rough-shipping/route";

function checkRequest(): Request {
  return new Request("https://app.example.test/api/account/make/placeholder/rough-shipping", {
    body: JSON.stringify({ postalCode: "40111" }),
    headers: { "content-type": "application/json", origin: "https://app.example.test" },
    method: "POST",
  });
}

beforeEach(() => {
  mocks.customerId = randomUUID();
  mocks.checkRates.mockReset().mockResolvedValue({ status: "PENDING", message: "Ongkir menyusul" });
});

describe("rough custom shipping route", () => {
  it("limits an owning Customer per request while leaving another Customer independent", async () => {
    const id = randomUUID();
    const context = { params: Promise.resolve({ id }) };
    const first = await POST(checkRequest(), context);
    const second = await POST(checkRequest(), context);
    const third = await POST(checkRequest(), context);
    expect([first.status, second.status, third.status]).toEqual([200, 200, 429]);
    expect(third.headers.get("cache-control")).toBe("private, no-store");
    expect(mocks.checkRates).toHaveBeenCalledTimes(2);
    const nextCustomer = randomUUID();
    mocks.customerId = nextCustomer;
    const other = await POST(checkRequest(), context);
    expect(other.status).toBe(200);
    expect(mocks.checkRates).toHaveBeenLastCalledWith(nextCustomer, id, { postalCode: "40111" });
  });
});
