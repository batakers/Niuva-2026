import { readJsonBody } from "@/lib/http/body";
import { assertPublicMutationRequest } from "@/lib/http/public-mutation";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import { appError, toAppError } from "@/modules/shared/errors";
import type { AdminInvitationService } from "./invitation-service";

const limiter = createInMemoryRateLimiter({ limit: 5, windowMs: 60_000 });
export async function handleAcceptAdminInvitation(request: Request, service: Pick<AdminInvitationService, "accept">): Promise<Response> {
  const headers = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" };
  try {
    assertPublicMutationRequest(request, limiter, { endpointId: "admin-invitation-accept" });
    if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") throw appError("VALIDATION_ERROR");
    const body = await readJsonBody(request, { maxBytes: 4096 });
    await service.accept(body);
    return Response.json({ success: true }, { headers });
  } catch (reason) {
    const error = toAppError(reason);
    return Response.json({ error: { code: error.code, message: error.message } }, { status: error.status, headers });
  }
}
