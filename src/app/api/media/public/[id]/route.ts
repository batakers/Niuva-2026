import { PublicMediaService } from "@/modules/public-media/service";
import { isAppError } from "@/modules/shared/errors";
import { createRuntimeRateLimiter } from "@/lib/security/shared-rate-limit";
import { deriveActorKey } from "@/lib/security/actor-key";

export const runtime = "nodejs";
const limiter = createRuntimeRateLimiter({ namespace: "public-media-read", limit: 120, windowMs: 60_000 });
export async function GET(request: Request, { params }: Readonly<{ params: Promise<{ id: string }> }>): Promise<Response> {
  try {
    const rate = await limiter.check(deriveActorKey({ endpointId: "GET /api/media/public", headers: request.headers }));
    if (!rate.allowed) return new Response(null, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rate.retryAfterSeconds) } });
    const { id } = await params, service = new PublicMediaService();
    const result = await service.read(id).catch(async error => {
      if (!isAppError(error) || error.code !== "NOT_FOUND") throw error;
      return service.read(id, true);
    });
    return new Response(new Uint8Array(result.bytes), { headers: { "Content-Type": result.contentType, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", Vary: "Cookie" } });
  } catch {
    return new Response(null, { status: 404, headers: { "Cache-Control": "no-store", Vary: "Cookie" } });
  }
}
