import { requireAdmin } from "@/lib/auth/admin";
import { getPrismaClient } from "@/lib/db/prisma";
import { isAppError } from "@/modules/shared/errors";

export async function GET(): Promise<Response> {
  try {
    const access = await requireAdmin();
    const account = await getPrismaClient().adminProfile.findUnique({ where: { id: access.profile.id }, select: { displayName: true, authUser: { select: { name: true, email: true } } } });
    if (account === null) return Response.json({ error: "Akun tidak ditemukan." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    return Response.json({ name: account.displayName ?? account.authUser?.name ?? "Admin Niuva", email: account.authUser?.email ?? null, role: access.profile.role }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return Response.json({ error: "Akun tidak tersedia." }, { status: isAppError(error) ? error.status : 500, headers: { "Cache-Control": "no-store" } });
  }
}
