import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/db/prisma", () => ({ getPrismaClient: () => ({}) }));
import { CustomerPrivacyService } from "@/modules/customer-privacy/service";
import { CustomerPrivacyRepository } from "@/modules/customer-privacy/repository";
import type { AdminAccess } from "@/lib/auth/admin";
const id = "7614b2eb-6e0c-4a27-9162-e94fb377ebd4";
const access = (role: "ADMIN" | "OWNER", active = true): AdminAccess => ({ authUserId: "fixture", profile: { id, authUserId: "fixture", role, isActive: active } });
describe("Owner privacy read permission", () => {
  it.each([access("ADMIN"), access("OWNER", false)])("denies inactive or ordinary Admin before detail or list read", async actor => {
    const repo = new CustomerPrivacyRepository();
    const detail = vi.spyOn(repo, "getOwnerDetail");
    const list = vi.spyOn(repo, "listOwnerFiltered");
    const service = new CustomerPrivacyService(repo, null, () => new Date(), () => undefined);
    await expect(service.getOwnerDetail(actor, id)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(service.listOwner(actor, {})).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(detail).not.toHaveBeenCalled(); expect(list).not.toHaveBeenCalled();
  });
  it("checks feature availability and validates UUID before reading", async () => {
    const repo = new CustomerPrivacyRepository(); const detail = vi.spyOn(repo, "getOwnerDetail");
    const unavailable = new CustomerPrivacyService(repo, null, () => new Date(), () => { throw new Error("unavailable"); });
    await expect(unavailable.getOwnerDetail(access("OWNER"), id)).rejects.toThrow("unavailable");
    const service = new CustomerPrivacyService(repo, null, () => new Date(), () => undefined);
    await expect(service.getOwnerDetail(access("OWNER"), "bad")).rejects.toThrow();
    expect(detail).not.toHaveBeenCalled();
  });
});
