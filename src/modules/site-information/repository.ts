import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import type { AdminAccess } from "@/lib/auth/admin";
import { appError } from "@/modules/shared/errors";
import { defaultSiteInformation } from "./defaults";
import { siteInformationSchema } from "./schema";
import type { PublicSiteInformation, SiteInformationSnapshot } from "./types";

export async function loadSiteInformation(): Promise<SiteInformationSnapshot> {
  const row = await getPrismaClient().siteInformation.findUnique({ where: { scope: "PUBLIC_PROFILE" }, select: { version: true, valuesJson: true } });
  return row ? { version: row.version, values: siteInformationSchema.parse(row.valuesJson) } : { version: 0, values: defaultSiteInformation };
}
export async function publishSiteInformation(access: AdminAccess, expectedVersion: number, values: PublicSiteInformation) {
  return getPrismaClient().$transaction(async tx => {
    await tx.$executeRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext('niuva-site-information'))`);
    const actor = await tx.adminProfile.findFirst({ where: { id: access.profile.id, role: access.profile.role, isActive: true }, select: { id: true, authUserId: true } });
    if (!actor || (actor.authUserId !== null && actor.authUserId !== access.authUserId)) throw appError("FORBIDDEN");
    const current = await tx.siteInformation.findUnique({ where: { scope: "PUBLIC_PROFILE" }, select: { id: true, version: true } });
    if ((current?.version ?? 0) !== expectedVersion) throw appError("CONFLICT", { message: "Informasi situs sudah diperbarui orang lain. Muat ulang sebelum menerbitkan." });
    const version = expectedVersion + 1;
    const valuesJson = { ...values, socialLinks: values.socialLinks.map(link => ({ ...link })) };
    const row = current
      ? await tx.siteInformation.update({ where: { id: current.id }, data: { version, valuesJson, publishedAt: new Date(), publishedByAdminId: actor.id }, select: { id: true } })
      : await tx.siteInformation.create({ data: { scope: "PUBLIC_PROFILE", version, valuesJson, publishedByAdminId: actor.id }, select: { id: true } });
    await tx.siteInformationRevision.create({ data: { siteInformationId: row.id, version, valuesJson, actorId: actor.id } });
    await tx.auditLog.create({ data: { actorType: "ADMIN", actorId: actor.id, entityType: "SiteInformation", entityId: row.id, action: "site-information.published", metadataJson: { version } } });
    return { version };
  });
}
