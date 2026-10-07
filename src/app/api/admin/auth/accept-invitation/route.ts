import { handleAcceptAdminInvitation } from "@/modules/admin-auth/invitation-handler";
import { getAdminInvitationService } from "@/modules/admin-auth/invitation-runtime";
import { withAdminAuthOrigin } from "@/modules/admin-auth/request-origin";
import { parseServerEnvironment } from "@/lib/env/server";

export const runtime = "nodejs";
export async function POST(request: Request): Promise<Response> {
  try {
    const publicRequest = withAdminAuthOrigin(request, parseServerEnvironment().BETTER_AUTH_URL);
    return await handleAcceptAdminInvitation(publicRequest, getAdminInvitationService());
  } catch {
    return Response.json({ error: { code: "AUTH_UNAVAILABLE", message: "Layanan autentikasi Admin belum tersedia." } }, { status: 503, headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" } });
  }
}
