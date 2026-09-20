import { isLocalDemoMode } from "@/lib/env/server";
import type { CheckoutPaymentProvider } from "@/modules/checkout/service";
import { createMidtransSnapGatewayFromEnvironment } from "@/modules/payment/midtrans";
import { LocalDemoPaymentProvider, LocalDemoShippingProvider } from "./local-demo";
import { createBiteshipRateGatewayFromEnvironment } from "@/modules/shipping/biteship";
import type { BiteshipRateProvider } from "@/modules/shipping/biteship";
import { createCustomShippingProvider } from "@/modules/shipping/custom-provider";
import type { CustomShippingProvider } from "@/modules/shipping/service";

/**
 * Resolve a server adapter without allowing demo mode to leak into hosted
 * environments. The real factories remain the default and keep their own
 * sandbox/live guards.
 */
export function createShippingProviderForRuntime(
  source: Readonly<Record<string, string | undefined>> = process.env,
): BiteshipRateProvider {
  return isLocalDemoMode(source)
    ? new LocalDemoShippingProvider()
    : createBiteshipRateGatewayFromEnvironment(source);
}

export function createCustomShippingProviderForRuntime(
  source: Readonly<Record<string, string | undefined>> = process.env,
): CustomShippingProvider {
  return createCustomShippingProvider(createShippingProviderForRuntime(source));
}

export function createPaymentProviderForRuntime(
  source: Readonly<Record<string, string | undefined>> = process.env,
): CheckoutPaymentProvider {
  return isLocalDemoMode(source)
    ? new LocalDemoPaymentProvider()
    : createMidtransSnapGatewayFromEnvironment(source);
}
