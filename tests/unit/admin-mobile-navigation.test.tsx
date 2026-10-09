import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminShell } from "@/components/niuva/admin-shell";

vi.mock("@/components/niuva/admin-session-actions", () => ({ AdminSessionActions: () => null }));

describe("Admin mobile navigation", () => {
  it("opens a named navigation dialog and returns focus to its trigger on Escape", async () => {
    render(<AdminShell active="orders" role="OWNER"><main id="main-content">Orders</main></AdminShell>);
    const trigger = screen.getByRole("button", { name: "Menu Admin" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog", { name: "Navigasi Admin" });
    expect(within(dialog).getByRole("link", { name: "Orders" })).toHaveAttribute("aria-current", "page");
    expect(within(dialog).getByRole("link", { name: "Admin & Akses" })).toHaveAttribute("href", "/admin/admins");
    fireEvent.keyDown(dialog, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("keeps Owner routes out of the Admin navigation dialog", async () => {
    render(<AdminShell active="orders" role="ADMIN"><main id="main-content">Orders</main></AdminShell>);
    fireEvent.click(screen.getByRole("button", { name: "Menu Admin" }));
    const dialog = await screen.findByRole("dialog", { name: "Navigasi Admin" });
    expect(within(dialog).queryByRole("link", { name: "Admin & Akses" })).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("link", { name: "Privasi Customer" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Orders" })).toHaveAttribute("href", "/admin/orders");
  });
});
