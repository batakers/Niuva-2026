import { render } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ access: vi.fn(), redirect: vi.fn((path: string) => { throw new Error("redirect:" + path); }) }));
vi.mock("next/server", () => ({ connection: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/app/admin/admin-page-access", () => ({ loadAdminPageAccess: mocks.access }));
import AdminPricingPage from "@/app/admin/pricing/page";
beforeEach(() => { mocks.redirect.mockClear(); });
it("redirects authorized Owner to the working tariff destination", async () => {
  mocks.access.mockResolvedValue({ kind: "granted", access: { profile: { role: "OWNER" } } });
  await expect(AdminPricingPage()).rejects.toThrow("redirect:/admin/settings/custom-print-rates");
});
it("denies ordinary Admin before accessing tariff data", async () => {
  mocks.access.mockResolvedValue({ kind: "granted", access: { profile: { role: "ADMIN" } } });
  render(await AdminPricingPage()); expect(document.querySelector('[data-system-state="admin-access-forbidden"]')).toBeTruthy(); expect(mocks.redirect).not.toHaveBeenCalled();
});
it("retains the unauthenticated gate before redirect", async () => {
  mocks.access.mockResolvedValue({ kind: "denied", state: "UNAUTHENTICATED" });
  render(await AdminPricingPage()); expect(mocks.redirect).not.toHaveBeenCalled();
});
