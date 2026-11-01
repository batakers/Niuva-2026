import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AccountView } from "@/app/account/account-view";
import type { CustomerAccount } from "@/modules/customer-auth/repository";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), replace: vi.fn() }) }));

function account(displayName: string | null): CustomerAccount {
  return {
    orders: [{
      createdAt: new Date("2026-10-31T03:00:00.000Z"),
      customerName: "Rani",
      grandTotalRp: "539000",
      id: "44444444-4444-4444-8444-444444444444",
      orderNumber: "ORD-20261031-7F3K2M9Q",
      orderType: "RETAIL",
      status: "PENDING_PAYMENT",
    }],
    profile: { avatarUrl: null, displayName, email: "rani@example.test", id: "c", normalizedEmail: "rani@example.test" },
  };
}

describe("Customer account view", () => {
  it.each([["with a name", "Rani Pratiwi"], ["without a name", null]])("shows the verified email once as its own text %s", (_, name) => {
    render(<AccountView account={account(name)} avatar={{ mode: "none" }} requests={[{
      createdAt: new Date("2026-10-28T03:00:00.000Z"),
      estimate: { lowerRp: "77500", upperRp: "100750" },
      id: "11111111-1111-4111-8111-111111111111",
      intakeMode: "MODEL_READY",
      previewTotalRp: null,
      quote: { status: "SENT", version: 1 },
      referenceNumber: "CPR-20261028-A1B2C3D4",
      status: "QUOTE_SENT",
    }]} />);

    expect(screen.getByText("rani@example.test", { exact: true })).toBeVisible();
    expect(screen.queryAllByText("Rani Pratiwi")).toHaveLength(name ? 1 : 0);
  });

  it("names statuses for customers instead of showing stored enums", () => {
    render(<AccountView account={account("Rani Pratiwi")} avatar={{ mode: "none" }} requests={[]} />);

    const orders = screen.getByRole("list", { name: "Riwayat pesanan" });
    expect(within(orders).getByText("Menunggu pembayaran")).toBeVisible();
    expect(within(orders).queryByText(/PENDING_PAYMENT|RETAIL/)).toBeNull();
    expect(screen.getByRole("link", { name: "Mulai Custom 3D Print" })).toHaveAttribute("href", "/custom-print");
  });
});
