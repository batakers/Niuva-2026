import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { getPrismaClient } from "@/lib/db/prisma";
import type { AdminAccess } from "@/lib/auth/admin";
import { SiteInformationService } from "@/modules/site-information/service";
import { defaultSiteInformation } from "@/modules/site-information/defaults";
import { readPublicSiteInformation } from "@/modules/site-information/public-reader";

describe("published site information", () => {
  it("publishes a validated public DTO, keeps revision history and rejects stale writers", async () => {
    const prisma = getPrismaClient();
    const profile = await prisma.adminProfile.create({ data: { role: "ADMIN", isActive: true } });
    const access: AdminAccess = { authUserId: randomUUID(), profile: { id: profile.id, role: "ADMIN", isActive: true } };
    const service = new SiteInformationService();
    const before = await service.load(access);
    const values = { ...defaultSiteInformation, shortDescription: "Profil fixture untuk pengujian publik.", email: "public-fixture@example.test", phone: "+6281234567890", socialLinks: [{ label: "Instagram", href: "https://www.instagram.com/example" }] };
    const published = await service.publish(access, { expectedVersion: before.version, values });
    expect(published.version).toBe(before.version + 1);
    expect(await readPublicSiteInformation()).toEqual(values);
    await expect(service.publish(access, { expectedVersion: before.version, values })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(service.publish(access, { expectedVersion: published.version, values: { ...values, socialLinks: [{ label: "Unsafe", href: "javascript:alert(1)" }] } })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect((await service.load(access)).version).toBe(published.version);
    expect(await prisma.siteInformationRevision.count({ where: { version: published.version } })).toBe(1);
    await service.publish(access, { expectedVersion: published.version, values: defaultSiteInformation });
    await prisma.adminProfile.update({ where: { id: profile.id }, data: { isActive: false } });
    await expect(service.publish(access, { expectedVersion: published.version + 1, values })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("uses approved static facts when the public reader cannot read storage", async () => {
    expect(await readPublicSiteInformation(async () => { throw new Error("offline"); })).toEqual(defaultSiteInformation);
  });
});
