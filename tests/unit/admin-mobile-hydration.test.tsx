import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import Link from "next/link";
import { AdminMobileNavigation } from "@/components/niuva/admin-sidebar";

const hydration = vi.hoisted(() => ({ ready: false }));
vi.mock("@/components/niuva/use-hydrated", () => ({ useHydrated: () => hydration.ready }));

it("preserves a navigation disclosure opened before hydration", async () => {
  const { container, rerender } = render(<AdminMobileNavigation><Link href="/admin/orders">Orders</Link></AdminMobileNavigation>);
  fireEvent.click(screen.getByText("Menu Admin"));
  expect(container.querySelector("details")).toHaveAttribute("open");
  hydration.ready = true;
  rerender(<AdminMobileNavigation><Link href="/admin/orders">Orders</Link></AdminMobileNavigation>);
  expect(await screen.findByRole("dialog", { name: "Navigasi Admin" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("href", "/admin/orders");
});
