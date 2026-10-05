import { z } from "zod";
import { requireCustomer } from "@/lib/auth/customer";
import { readJsonBody } from "@/lib/http/body";
import { assertPublicMutationRequest } from "@/lib/http/public-mutation";
import { apiError, apiSuccess, createCorrelationId } from "@/lib/http/response";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import { B2BQuoteService } from "@/modules/inquiry/b2b-quote";
import { parseWithValidation } from "@/modules/shared/validation";

export const runtime = "nodejs";
const limiter = createInMemoryRateLimiter({ limit: 5, maxKeys: 256, windowMs: 60_000 });
const schema = z.object({ decision: z.enum(["ACCEPTED", "DECLINED"]) }).strict();

export async function POST(request: Request, context: RouteContext<"/api/account/inquiries/[id]/quotes/[quoteId]/decision">) {
  const correlationId = createCorrelationId();
  try {
    assertPublicMutationRequest(request, limiter, {
      endpointId: "POST /api/account/inquiries/[id]/quotes/[quoteId]/decision",
    });
    const customer = await requireCustomer();
    const { id, quoteId } = await context.params;
    const { decision } = parseWithValidation(schema, await readJsonBody(request, { maxBytes: 1_024 }));
    const result = await new B2BQuoteService().decide({ inquiryId: id, quoteId, decision }, customer.id);
    const response = apiSuccess(result, { correlationId });
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch (error) {
    const response = apiError(error, correlationId);
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
