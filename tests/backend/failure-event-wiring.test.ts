import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.hoisted(() => vi.fn());

vi.mock("@/lib/observability/repository", () => ({
  PrismaFailureEventRepository: class {
    create = create;
  },
}));

import {
  recordAdminPageFailure,
  resetAdminPageFailureLogger,
} from "@/app/admin/admin-page-failure";
import { PaymentWebhookService } from "@/modules/payment/webhook-service";

async function flush(): Promise<void> {
  await new Promise((resolve) => setImmediate(resolve));
}

describe("failure persistence wiring (default loggers)", () => {
  beforeEach(() => {
    create.mockReset();
    create.mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.stubEnv("DATABASE_URL", "postgresql://niuva_test@127.0.0.1:5432/niuva_test");
    resetAdminPageFailureLogger();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    resetAdminPageFailureLogger();
  });

  it("stores admin page failures with the boundary and safe context", async () => {
    recordAdminPageFailure(new Error("db down"), "page:/admin/orders", {
      orderId: "ord_1",
    });
    await flush();

    expect(create).toHaveBeenCalledTimes(1);
    const stored = create.mock.calls[0]?.[0];
    expect(stored).toMatchObject({
      boundary: "page:/admin/orders",
      safeContext: { orderId: "ord_1" },
    });
    expect(JSON.stringify(stored)).not.toContain("db down");
  });

  it("stores webhook failures without payload, signature, or message", async () => {
    const service = new PaymentWebhookService({ serverKey: "test-server-key" });

    await expect(
      service.handleMidtransNotification({
        gross_amount: "100000.00",
        order_id: "ORD-SECRET-1",
        signature_key: "sig-secret",
      }),
    ).rejects.toBeDefined();
    await flush();

    expect(create).toHaveBeenCalledTimes(1);
    const stored = create.mock.calls[0]?.[0];
    expect(stored.boundary).toBe("webhook:midtrans");
    expect(stored.safeContext).toEqual({
      outcome: expect.any(String),
      stage: "parse",
    });
    const serialised = JSON.stringify(stored);
    expect(serialised).not.toContain("ORD-SECRET-1");
    expect(serialised).not.toContain("sig-secret");
    expect(serialised).not.toContain("100000");
  });

  it("does not change the webhook outcome when storing fails", async () => {
    create.mockRejectedValue(new Error("db down"));
    const service = new PaymentWebhookService({ serverKey: "test-server-key" });

    await expect(service.handleMidtransNotification({})).rejects.toMatchObject({
      code: expect.any(String),
    });
    await flush();

    expect(create).toHaveBeenCalledTimes(1);
  });
});
