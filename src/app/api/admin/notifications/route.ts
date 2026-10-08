import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { readJsonBody } from "@/lib/http/body";
import { apiError, apiSuccess } from "@/lib/http/response";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { AdminNotificationService } from "@/modules/admin/notifications/service";
import { parseWithValidation } from "@/modules/shared/validation";

const schema = z.object({
  operation: z.enum(["bootstrap", "poll"]),
  cursor: z.string().max(100).nullable().optional(),
  unread: z.boolean().optional(),
}).strict();

export async function POST(request: Request): Promise<Response> {
  try {
    if (request.signal.aborted) return new Response(null, { status: 499, headers: { "Cache-Control": "no-store", Vary: "Cookie" } });
    assertSameOriginRequest(request);
    const access = await requireAdmin();
    const input = parseWithValidation(schema, await readJsonBody(request, { maxBytes: 8192 }));
    const service = new AdminNotificationService();
    const result = input.operation === "bootstrap"
      ? await service.bootstrap(access)
      : await service.poll(access, { cursor: input.cursor, unread: input.unread });
    return apiSuccess(result, { headers: { "Cache-Control": "no-store", Vary: "Cookie" } });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499, headers: { "Cache-Control": "no-store", Vary: "Cookie" } });
    const response = apiError(error, undefined, { boundary: "api:POST /api/admin/notifications" });
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Vary", "Cookie");
    return response;
  }
}
