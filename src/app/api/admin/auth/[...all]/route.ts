import { getAdminAuth } from "@/lib/auth/admin-engine";
import { parseServerEnvironment } from "@/lib/env/server";
import { handleAdminAuthRequest } from "@/modules/admin-auth/handler";
import { withAdminAuthOrigin } from "@/modules/admin-auth/request-origin";

export const runtime = "nodejs";
export async function GET(request: Request): Promise<Response> {
  try {
    const engine = getAdminAuth();
    const publicRequest = withAdminAuthOrigin(request, parseServerEnvironment().BETTER_AUTH_URL);
    return await handleAdminAuthRequest(publicRequest, engine);
  } catch {
    return Response.json({ error: { code: "AUTH_UNAVAILABLE", message: "Layanan autentikasi Admin belum tersedia." } }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
export const POST = GET;
