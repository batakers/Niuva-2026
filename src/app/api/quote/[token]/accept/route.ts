import { assertPublicMutationRequest } from "@/lib/http/public-mutation";
import {
  apiError,
  apiSuccess,
  createCorrelationId,
} from "@/lib/http/response";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import { getRouteAccessTokenEntityId } from "@/modules/shared/access-token";
import { appError } from "@/modules/shared/errors";
import { QuoteService } from "@/modules/quote/service";
import { createPaymentProviderForRuntime } from "@/modules/providers/runtime";

export const runtime = "nodejs";

const quoteDecisionRateLimiter = createInMemoryRateLimiter({
  limit: 5,
  maxKeys: 256,
  windowMs: 60_000,
});

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const correlationId = createCorrelationId();

  try {
    assertPublicMutationRequest(request, quoteDecisionRateLimiter);
    const { token } = await context.params;
    const quoteId = getRouteAccessTokenEntityId(token);

    if (quoteId === null) {
      throw appError("UNAUTHORIZED");
    }

    const result = await new QuoteService({
      paymentProvider: createPaymentProviderForRuntime(),
    }).accept({ quoteId, token });

    return apiSuccess(
      {
        kind: result.kind,
        orderAccessToken: result.orderAccessToken?.token,
        orderId: result.orderId,
        orderNumber: result.orderNumber,
        payment: result.payment,
        paymentAttemptId: result.paymentAttemptId,
        status: result.status,
        totalRp: result.totalRp,
      },
      { correlationId, status: result.kind === "CREATED" ? 201 : 200 },
    );
  } catch (error) {
    return apiError(error, correlationId);
  }
}
