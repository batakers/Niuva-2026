import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { readJsonBody } from "@/lib/http/body";
import { apiError, apiSuccess } from "@/lib/http/response";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { createRuntimeRateLimiter } from "@/lib/security/shared-rate-limit";
import { PublicMediaService } from "@/modules/public-media/service";
import { publicMediaOwnerSchema } from "@/modules/public-media/schema";
import { parseWithValidation } from "@/modules/shared/validation";
import { appError } from "@/modules/shared/errors";

const schema = z.discriminatedUnion("operation", [
  z.object({ operation: z.literal("intent"), owner: publicMediaOwnerSchema, contentType: z.enum(["image/jpeg", "image/png", "image/webp"]), sizeBytes: z.int().min(1).max(10 * 1024 * 1024) }).strict(),
  z.object({ operation: z.literal("confirm"), assetId: z.uuid() }).strict(),
  z.object({ operation: z.literal("list"), owner: publicMediaOwnerSchema }).strict(),
]);
const headers = { "Cache-Control": "no-store", Vary: "Cookie" };
const limiter = createRuntimeRateLimiter({ namespace: "admin-public-media", limit: 20, windowMs: 60_000 });
export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOriginRequest(request);
    const actor = await requireAdmin(), rate = await limiter.check(actor.profile.id);
    if (!rate.allowed) throw appError("RATE_LIMITED", { details: { retryAfterSeconds: String(rate.retryAfterSeconds) } });
    const input = parseWithValidation(schema, await readJsonBody(request, { maxBytes: 8192 }));
    const service = new PublicMediaService();
    const result = input.operation === "intent" ? await service.createIntent({ owner: input.owner, contentType: input.contentType, sizeBytes: input.sizeBytes })
      : input.operation === "confirm" ? await service.confirm({ assetId: input.assetId }) : await service.list(input.owner);
    return apiSuccess(result, { headers });
  } catch (error) {
    const response = apiError(error, undefined, { boundary: "api:POST /api/admin/media" });
    for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
    return response;
  }
}
