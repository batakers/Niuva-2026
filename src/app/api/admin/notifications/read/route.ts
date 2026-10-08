import { requireAdmin } from "@/lib/auth/admin";
import { readJsonBody } from "@/lib/http/body";
import { apiError, apiSuccess } from "@/lib/http/response";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { AdminNotificationService } from "@/modules/admin/notifications/service";

export async function POST(request: Request): Promise<Response> {
  try {
    if (request.signal.aborted) return new Response(null, { status: 499, headers: { "Cache-Control": "no-store", Vary: "Cookie" } });
    assertSameOriginRequest(request);
    const access = await requireAdmin();
    const input = await readJsonBody(request, { maxBytes: 8192 });
    await new AdminNotificationService().markRead(access, input);
    return apiSuccess({ saved: true }, { headers: { "Cache-Control": "no-store", Vary: "Cookie" } });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499, headers: { "Cache-Control": "no-store", Vary: "Cookie" } });
    const response = apiError(error, undefined, { boundary: "api:POST /api/admin/notifications/read" });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Vary", "Cookie");
    return response;
  }
}
