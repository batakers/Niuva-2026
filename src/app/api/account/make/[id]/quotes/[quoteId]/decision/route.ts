import { z } from "zod";
import { requireCustomer } from "@/lib/auth/customer";
import { readJsonBody } from "@/lib/http/body";
import { assertPublicMutationRequest } from "@/lib/http/public-mutation";
import { apiError, apiSuccess, createCorrelationId } from "@/lib/http/response";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import { CustomerWorkRepository } from "@/modules/customer-work/repository";
import { createPaymentProviderForRuntime } from "@/modules/providers/runtime";
import { QuoteService } from "@/modules/quote/service";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";

export const runtime = "nodejs";
const limiter = createInMemoryRateLimiter({ limit: 5, maxKeys: 256, windowMs: 60_000 });
const schema = z.object({ decision: z.enum(["accept", "decline"]) }).strict();

export async function POST(request: Request, context: RouteContext<"/api/account/make/[id]/quotes/[quoteId]/decision">) {
  const correlationId = createCorrelationId();
  try {
    assertPublicMutationRequest(request, limiter, {
      endpointId: "POST /api/account/make/[id]/quotes/[quoteId]/decision",
    });
    const customer = await requireCustomer();
    const { id, quoteId } = await context.params;
    const work = await new CustomerWorkRepository().request(customer.id, id);
    if (work === null || !work.quotes.some((quote) => quote.id === quoteId)) throw appError("NOT_FOUND");
    const { decision } = parseWithValidation(schema, await readJsonBody(request, { maxBytes: 1_024 }));
    const result = decision === "accept"
      ? await new QuoteService({ paymentProvider: createPaymentProviderForRuntime() }).accept({ quoteId }, customer.id)
      : await new QuoteService().decline({ quoteId }, customer.id);
    const response = apiSuccess(result, { correlationId });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    const response = apiError(error, correlationId);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
