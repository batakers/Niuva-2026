import { z } from "zod";

import { requireCustomer } from "@/lib/auth/customer";
import { readJsonBody } from "@/lib/http/body";
import { assertPublicMutationRequest } from "@/lib/http/public-mutation";
import { apiError, apiSuccess, createCorrelationId } from "@/lib/http/response";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import { CustomerWorkRepository } from "@/modules/customer-work/repository";
import { parseWithValidation } from "@/modules/shared/validation";

export const runtime = "nodejs";
const limiter = createInMemoryRateLimiter({ limit: 5, maxKeys: 256, windowMs: 60_000 });
const schema = z.object({ kind: z.enum(["B2B_INQUIRY", "CUSTOM_PRINT_REQUEST"]), token: z.string().min(32).max(512) }).strict();

export async function POST(request: Request) {
  const correlationId = createCorrelationId();
  try {
    assertPublicMutationRequest(request, limiter);
    const customer = await requireCustomer();
    const input = parseWithValidation(schema, await readJsonBody(request, { maxBytes: 2_048 }));
    const result = await new CustomerWorkRepository().claim({ ...input, customerId: customer.id });
    return apiSuccess({ id: result.id, kind: result.kind, referenceNumber: result.referenceNumber }, { correlationId });
  } catch (error) {
    return apiError(error, correlationId);
  }
}
