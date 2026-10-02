import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ role: "OWNER", available: true }));
vi.mock("next/server", () => ({ connection: async () => {} }));
vi.mock("@/lib/auth/clerk", () => ({ requireAdmin: async () => ({ clerkUserId: "fixture-owner", profile: { id: "00000000-0000-4000-8000-000000000001", role: state.role, isActive: true } }) }));
vi.mock("@/lib/db/prisma", () => ({ getPrismaClient: () => ({}) }));
vi.mock("@/modules/customer-privacy/core", async original => ({ ...await original<typeof import("@/modules/customer-privacy/core")>(), isCustomerPrivacyAvailable: () => state.available }));
import OwnerPrivacyPage from "@/app/admin/privacy/page";
import PolicyPreview from "@/app/admin/privacy/policy/page";
import { CustomerPrivacyRepository } from "@/modules/customer-privacy/repository";
beforeEach(() => { state.role = "OWNER"; state.available = true; vi.restoreAllMocks(); });
describe("Owner privacy server rendering", () => {
  it("renders Owner route and legal previews behind the same permission", async () => {
    vi.spyOn(CustomerPrivacyRepository.prototype, "listOwner").mockResolvedValue([]);
    const page = renderToStaticMarkup(await OwnerPrivacyPage({ searchParams: Promise.resolve({}) }));
    expect(page).toContain("Privasi Customer"); expect(page).toContain("3×24 jam kalender"); expect(page).toContain("Tinjau draf Syarat Layanan");
    for (const document of ["terms", "privacy"]) {
      const draft = renderToStaticMarkup(await PolicyPreview({ searchParams: Promise.resolve({ document }) }));
      expect(draft).toContain(document === "terms" ? "DRAFT-TERMS-2026-10-02-v2" : "DRAFT-PRIVACY-2026-10-02-v2");
      expect(draft).toContain("PT. NIUVA INOVASI UTAMA"); expect(draft).toContain("Belum berlaku");
    }
  });
  it("ordinary Admin never reads request rows or drafts", async () => {
    state.role = "ADMIN"; const read = vi.spyOn(CustomerPrivacyRepository.prototype, "listOwner");
    expect(renderToStaticMarkup(await OwnerPrivacyPage({ searchParams: Promise.resolve({}) }))).not.toContain("Tinjau draf");
    expect(renderToStaticMarkup(await PolicyPreview({ searchParams: Promise.resolve({ document: "terms" }) }))).not.toContain("DRAFT-TERMS");
    expect(read).not.toHaveBeenCalled();
  });
  it("environment unavailable does not read Customer requests", async () => {
    state.available = false; const read = vi.spyOn(CustomerPrivacyRepository.prototype, "listOwner");
    expect(renderToStaticMarkup(await OwnerPrivacyPage({ searchParams: Promise.resolve({}) }))).toContain("hanya aktif pada Development lokal"); expect(read).not.toHaveBeenCalled();
  });
});
