import { readJsonBody } from "@/lib/http/body";
import { assertPublicMutationRequest } from "@/lib/http/public-mutation";
import {
  apiError,
  apiSuccess,
  createCorrelationId,
} from "@/lib/http/response";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import { createBiteshipRateGatewayFromEnvironment } from "@/modules/shipping/biteship";
import { RetailShippingRateService } from "@/modules/shipping/retail-rate-service";

export const runtime = "nodejs";

const SHIPPING_RATES_MAX_BODY_BYTES = 8 * 1_024;
const shippingRatesRateLimiter = createInMemoryRateLimiter({
  limit: 10,
  maxKeys: 256,
  windowMs: 60_000,
});

export async function POST(request: Request) {
  const correlationId = createCorrelationId();

  try {
    assertPublicMutationRequest(request, shippingRatesRateLimiter);
    const payload = await readJsonBody(request, {
      maxBytes: SHIPPING_RATES_MAX_BODY_BYTES,
    });
    const service = new RetailShippingRateService({
      provider: createBiteshipRateGatewayFromEnvironment(),
    });
    const rates = await service.getRates(payload);

    return apiSuccess({
      expiresAt: rates.expiresAt.toISOString(),
      options: rates.options.map((option) => ({
        courierCode: option.courierCode,
        courierName: option.courierName,
        ...(option.etaText === undefined ? {} : { etaText: option.etaText }),
        optionId: option.optionId,
        priceRp: option.priceRp.toString(),
        serviceCode: option.serviceCode,
        serviceName: option.serviceName,
      })),
    }, { correlationId });
  } catch (error) {
    return apiError(error, correlationId);
  }
}
