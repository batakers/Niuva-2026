import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AdminAccess } from "@/lib/auth/clerk";
import type { AdminPricingRuleRow } from "@/modules/admin/operations";

const authMocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
}));

const nextServerMocks = vi.hoisted(() => ({
  connection: vi.fn(),
}));

const pricingMocks = vi.hoisted(() => ({
  getActivePricingRule: vi.fn(),
  listPricingRules: vi.fn(),
}));

vi.mock("@/components/niuva/admin-session-actions", () => ({
  AdminSessionActions: () => null,
}));

vi.mock("@/lib/auth/clerk", () => ({
  requireAdmin: authMocks.requireAdmin,
}));

vi.mock("next/server", () => ({
  connection: nextServerMocks.connection,
}));

vi.mock("@/app/admin/actions", () => ({
  activatePricingRuleAction: vi.fn(),
}));

vi.mock("@/modules/admin/operations", () => ({
  AdminOperationsService: vi.fn(function MockAdminOperationsService() {
    return pricingMocks;
  }),
  parseAdminPage: (value: string | undefined) => (value === "2" ? 2 : 1),
}));

import AdminPricingPage from "@/app/admin/pricing/page";

const ownerAccess = {
  clerkUserId: "user_owner",
  profile: {
    clerkUserId: "user_owner",
    id: "a6f443d8-3e8a-49b5-81d0-94d56e06c208",
    isActive: true,
    role: "OWNER",
  },
} satisfies AdminAccess;

const activeRule = {
  approvedAt: new Date("2026-09-11T08:00:00.000Z"),
  approvedBy: "Owner",
  code: "CUSTOM_PRINT_V1",
  createdAt: new Date("2026-09-11T07:00:00.000Z"),
  definitionJson: { quantitySemantics: "PER_UNIT" },
  id: "active-rule",
  status: "ACTIVE",
  updatedAt: new Date("2026-09-11T08:00:00.000Z"),
  version: 1,
} satisfies AdminPricingRuleRow;

const draftRule = {
  ...activeRule,
  approvedAt: null,
  approvedBy: null,
  definitionJson: { longValue: "x".repeat(300) },
  id: "draft-rule",
  status: "DRAFT",
  version: 2,
} satisfies AdminPricingRuleRow;

beforeEach(() => {
  authMocks.requireAdmin.mockReset();
  authMocks.requireAdmin.mockResolvedValue(ownerAccess);
  nextServerMocks.connection.mockReset();
  nextServerMocks.connection.mockResolvedValue(undefined);
  pricingMocks.getActivePricingRule.mockReset();
  pricingMocks.getActivePricingRule.mockResolvedValue(activeRule);
  pricingMocks.listPricingRules.mockReset();
  pricingMocks.listPricingRules.mockResolvedValue({
    generatedAt: new Date("2026-09-11T09:00:00.000Z"),
    hasNext: false,
    items: [draftRule],
    page: 2,
    role: "OWNER",
  });
});

describe("Admin Pricing page", () => {
  it("uses the global active rule even when the paginated list contains only drafts", async () => {
    render(await AdminPricingPage({ searchParams: Promise.resolve({ page: "2" }) }));

    expect(authMocks.requireAdmin).toHaveBeenCalledOnce();
    expect(pricingMocks.listPricingRules).toHaveBeenCalledWith({ page: 2 });
    expect(pricingMocks.getActivePricingRule).toHaveBeenCalledOnce();
    expect(screen.getByText("CUSTOM_PRINT_V1 aktif")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Aktivasi Pricing v1/ })).not.toBeInTheDocument();
    const summary = screen.getByRole("region", { name: "Ringkasan pricing rules" });
    expect(within(summary).getByText("Active").nextElementSibling).toHaveTextContent("1");
    expect(within(summary).getByText("Draft / retired").nextElementSibling).toHaveTextContent("1");
  });

  it("renders the activation form only when no active rule exists globally", async () => {
    pricingMocks.getActivePricingRule.mockResolvedValue(null);
    pricingMocks.listPricingRules.mockResolvedValue({
      generatedAt: new Date("2026-09-11T09:00:00.000Z"),
      hasNext: false,
      items: [],
      page: 1,
      role: "OWNER",
    });

    render(await AdminPricingPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("heading", { name: /Aktivasi Pricing v1/ })).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toHaveClass("accent-primary");
  });

  it("does not say there are no pricing rules on an empty later page when a global active rule exists", async () => {
    pricingMocks.listPricingRules.mockResolvedValue({
      generatedAt: new Date("2026-09-11T09:00:00.000Z"),
      hasNext: false,
      items: [],
      page: 2,
      role: "OWNER",
    });

    render(await AdminPricingPage({ searchParams: Promise.resolve({ page: "2" }) }));

    expect(screen.getByText("CUSTOM_PRINT_V1 aktif")).toBeInTheDocument();
    expect(screen.getByText("Tidak ada versi rule di halaman ini")).toBeInTheDocument();
    expect(screen.queryByText("Belum ada pricing rule")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Aktivasi Pricing v1/ })).not.toBeInTheDocument();
  });

  it("fails closed when the global active-rule lookup fails", async () => {
    pricingMocks.getActivePricingRule.mockRejectedValue(new Error("database unavailable"));

    render(await AdminPricingPage({ searchParams: Promise.resolve({ page: "2" }) }));

    expect(screen.getByRole("heading", { name: "Pricing rules belum dapat dimuat" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Aktivasi Pricing v1/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("keeps long JSON inside a keyboard-scrollable Pricing card", async () => {
    render(await AdminPricingPage({ searchParams: Promise.resolve({ page: "2" }) }));

    const json = screen.getByLabelText("Definisi CUSTOM_PRINT_V1 versi 2");
    expect(json).toHaveAttribute("tabindex", "0");
    expect(json).toHaveClass("max-w-full", "overflow-auto", "focus-visible:ring-3");
    expect(json.closest("article")).toHaveClass("min-w-0");
    expect(json.closest("section")).toHaveClass("min-w-0");
  });
});
