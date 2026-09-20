import { describe, expect, it } from "vitest";

import type { AdminAccess } from "@/lib/auth/clerk";
import { ShippingService } from "@/modules/shipping/service";
import type { ShippingServiceRepository } from "@/modules/shipping/repository";

const admin: AdminAccess = {
  clerkUserId: "user_admin",
  profile: {
    clerkUserId: "user_admin",
    id: "a6f443d8-3e8a-49b5-81d0-94d56e06c208",
    isActive: true,
    role: "ADMIN",
  },
};

describe("manual shipment metadata", () => {
  it("records a courier and tracking number through the authorized shipping service", async () => {
    let recorded: unknown;
    const repository: ShippingServiceRepository = {
      async attachPaymentProviderResult() {},
      async createCustomShippingPayment() {
        throw new Error("unused");
      },
      async findCustomShippingContext() {
        return null;
      },
      async paymentProviderOrderIdExists() {
        return false;
      },
      async recordShipmentMetadata(orderId, input) {
        recorded = { input, orderId };
        return { shipmentId: "shipment-1" };
      },
    };
    const service = new ShippingService({
      audit: async () => undefined,
      authorizeAdmin: async () => admin,
      repository,
    });

    await expect(service.recordShipmentMetadata("order-1", {
      courierCode: "JNE",
      trackingNumber: "JNE-123456",
    })).resolves.toEqual({ shipmentId: "shipment-1" });
    expect(recorded).toEqual({
      input: { courierCode: "JNE", trackingNumber: "JNE-123456" },
      orderId: "order-1",
    });
  });

  it("rejects malformed courier metadata before repository mutation", async () => {
    let calls = 0;
    const repository: ShippingServiceRepository = {
      async attachPaymentProviderResult() {},
      async createCustomShippingPayment() {
        throw new Error("unused");
      },
      async findCustomShippingContext() {
        return null;
      },
      async paymentProviderOrderIdExists() {
        return false;
      },
      async recordShipmentMetadata() {
        calls += 1;
        return { shipmentId: "shipment-1" };
      },
    };
    const service = new ShippingService({
      audit: async () => undefined,
      authorizeAdmin: async () => admin,
      repository,
    });

    await expect(service.recordShipmentMetadata("order-1", {
      courierCode: "",
      trackingNumber: "JNE-123456",
    })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(calls).toBe(0);
  });

  it("saves a validated custom shipping address without requiring provider activation", async () => {
    let saved: unknown;
    const repository: ShippingServiceRepository = {
      async attachPaymentProviderResult() {},
      async createCustomShippingPayment() {
        throw new Error("unused");
      },
      async findCustomShippingContext() {
        return null;
      },
      async paymentProviderOrderIdExists() {
        return false;
      },
      async saveCustomShippingAddress(orderId, input) {
        saved = { input, orderId };
        return { orderId };
      },
    };
    const service = new ShippingService({
      audit: async () => undefined,
      authorizeAdmin: async () => admin,
      repository,
    });

    await expect(service.saveCustomShippingAddress("order-1", {
      addressLine: "Jalan Contoh No. 1",
      city: "Jakarta Selatan",
      countryCode: "ID",
      district: "Tebet",
      phone: "+628000000000",
      postalCode: "12810",
      province: "DKI Jakarta",
      recipientName: "Client",
    })).resolves.toEqual({ orderId: "order-1" });
    expect(saved).toMatchObject({ orderId: "order-1", input: { postalCode: "12810" } });
  });
});
