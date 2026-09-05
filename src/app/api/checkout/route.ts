import { readJsonBody } from "@/lib/http/body";
import { assertPublicMutationRequest } from "@/lib/http/public-mutation";
import {
  apiError,
  apiSuccess,
  createCorrelationId,
} from "@/lib/http/response";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import { CheckoutService } from "@/modules/checkout/service";
import { createMidtransSnapGatewayFromEnvironment } from "@/modules/payment/midtrans";
import { createBiteshipRateGatewayFromEnvironment } from "@/modules/shipping/biteship";
import { RetailShippingRateService } from "@/modules/shipping/retail-rate-service";

export const runtime = "nodejs";

const CHECKOUT_MAX_BODY_BYTES = 16 * 1_024;
const checkoutRateLimiter = createInMemoryRateLimiter({
  limit: 5,
  maxKeys: 256,
  windowMs: 60_000,
});

export async function POST(request: Request) {
  const correlationId = createCorrelationId();

  try {
    assertPublicMutationRequest(request, checkoutRateLimiter);
    const payload = await readJsonBody(request, {
      maxBytes: CHECKOUT_MAX_BODY_BYTES,
    });
    const shippingProvider = new RetailShippingRateService({
      provider: createBiteshipRateGatewayFromEnvironment(),
    });
    const service = new CheckoutService({
      paymentProvider: createMidtransSnapGatewayFromEnvironment(),
      shippingProvider,
    });
    const result = await service.create(payload);

    if (result.kind === "REPLAY") {
      return apiSuccess({
        kind: result.kind,
        ...result.response,
      }, { correlationId });
    }

    return apiSuccess({
      accessToken: result.orderAccessToken.token,
      kind: result.kind,
      orderId: result.orderId,
      orderNumber: result.orderNumber,
      payment: result.payment,
      paymentAttemptId: result.paymentAttemptId,
      totalRp: result.totalRp,
    }, { correlationId, status: 201 });
  } catch (error) {
    return apiError(error, correlationId);
  }
}
