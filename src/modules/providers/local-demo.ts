import Decimal from "decimal.js";

import type { CheckoutPaymentProvider } from "@/modules/checkout/service";
import type {
  BiteshipRate,
  BiteshipRateProvider,
  BiteshipRateRequest,
} from "@/modules/shipping/biteship";

const DEMO_PROVIDER_NAME = "DEMO";

/**
 * Provider-neutral shipping adapter for the local demo runtime.
 *
 * It deliberately has no fetch, credentials, or provider-specific endpoint.
 * The service layer still resolves the catalog and signs the opaque option ID,
 * so the demo exercises the same server-authoritative path as a real adapter.
 */
export class LocalDemoShippingProvider implements BiteshipRateProvider {
  async getRates(
    input: BiteshipRateRequest,
  ): Promise<readonly BiteshipRate[]> {
    const totalWeightGrams = input.items.reduce(
      (total, item) => total + item.weightGrams * item.quantity,
      0,
    );
    const weightTier = Math.max(1, Math.ceil(totalWeightGrams / 500));
    const regularPriceRp = 12_000 + Math.min(weightTier, 8) * 1_500;
    const expressPriceRp = regularPriceRp + 8_000;

    return [
      this.createRate({
        etaText: "2–4 hari kerja",
        priceRp: regularPriceRp,
        serviceCode: "regular",
        serviceName: "Regular Demo",
      }),
      this.createRate({
        etaText: "1–2 hari kerja",
        priceRp: expressPriceRp,
        serviceCode: "express",
        serviceName: "Express Demo",
      }),
    ];
  }

  private createRate(input: Readonly<{
    etaText: string;
    priceRp: number;
    serviceCode: string;
    serviceName: string;
  }>): BiteshipRate {
    return {
      courierCode: "demo",
      courierName: "Kurir Demo Lokal",
      etaText: input.etaText,
      priceRp: new Decimal(input.priceRp),
      provider: DEMO_PROVIDER_NAME,
      providerPayload: {
        adapter: "local-demo",
        provider: DEMO_PROVIDER_NAME,
        serviceCode: input.serviceCode,
      },
      serviceCode: input.serviceCode,
      serviceName: input.serviceName,
    };
  }
}

/**
 * Payment adapter for local demo checkout. It creates a pending payment
 * attempt and a deterministic opaque token, but never calls Midtrans or any
 * other network service. A real webhook is still required to settle an order.
 */
export class LocalDemoPaymentProvider implements CheckoutPaymentProvider {
  readonly provider = DEMO_PROVIDER_NAME;

  async createPayment(input: Readonly<{
    amountRp: string;
    expiresAt: Date;
    orderId: string;
    orderNumber: string;
    providerOrderId: string;
  }>): Promise<Readonly<{ provider: string; token: string }>> {
    return {
      provider: DEMO_PROVIDER_NAME,
      token: `demo-token-${input.providerOrderId}`,
    };
  }
}
