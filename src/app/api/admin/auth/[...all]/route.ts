import { getAdminAuth } from "@/lib/auth/admin-engine";
import { handleAdminAuthRequest } from "@/modules/admin-auth/handler";

export const runtime = "nodejs";
export async function GET(request: Request): Promise<Response> {
  try { return await handleAdminAuthRequest(request, getAdminAuth()); } catch {
    return Response.json({ error: { code: "AUTH_UNAVAILABLE", message: "Layanan autentikasi Admin belum tersedia." } }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
export const POST = GET;
