import { assertPublicMutationRequest } from "@/lib/http/public-mutation";
import {
  apiError,
  apiSuccess,
  createCorrelationId,
} from "@/lib/http/response";
import { createRuntimeRateLimiter } from "@/lib/security/shared-rate-limit";
import { getRouteAccessTokenEntityId } from "@/modules/shared/access-token";
import { appError } from "@/modules/shared/errors";
import { QuoteService } from "@/modules/quote/service";

export const runtime = "nodejs";

const quoteDecisionRateLimiter = createRuntimeRateLimiter({ namespace: "src/app/api/quote/[token]/decline/route.ts",
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
    await assertPublicMutationRequest(request, quoteDecisionRateLimiter, {
      endpointId: "POST /api/quote/[token]/decline",
    });
    const { token } = await context.params;
    const quoteId = getRouteAccessTokenEntityId(token);

    if (quoteId === null) {
      throw appError("UNAUTHORIZED");
    }

    const result = await new QuoteService().decline({ quoteId, token });

    return apiSuccess(
      { id: result.id, status: result.status },
      { correlationId },
    );
  } catch (error) {
    return apiError(error, correlationId);
  }
}
