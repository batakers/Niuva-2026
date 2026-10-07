import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AdminPageHeader } from "@/app/admin/admin-page-header";

describe("Admin page navigation labels", () => {
  it("names the actual Queue origin on its return link and breadcrumb", () => {
    render(<AdminPageHeader title="Order fixture" returnHref="/admin/queue?group=orders" returnLabel="Kembali ke Orders" breadcrumbs={[{ label: "Orders", href: "/admin/queue?group=orders" }, { label: "Order fixture" }]} />);
    expect(screen.getByRole("link", { name: "Kembali ke Action Queue" })).toHaveAttribute("href", "/admin/queue?group=orders");
    expect(within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByRole("link", { name: "Action Queue" })).toHaveAttribute("href", "/admin/queue?group=orders");
  });

  it("names Overview when the record was opened from the command center", () => {
    render(<AdminPageHeader title="Inquiry fixture" returnHref="/admin?range=13m&group=inquiries" returnLabel="Kembali ke B2B Inquiries" />);
    expect(screen.getByRole("link", { name: "Kembali ke Overview" })).toHaveAttribute("href", "/admin?range=13m&group=inquiries");
  });

  it("keeps the explicit label for intermediate detail links", () => {
    render(<AdminPageHeader title="Proposal" returnHref="/admin/inquiries/00000000-0000-4000-8000-000000000000?returnTo=%2Fadmin%2Fqueue" returnLabel="Kembali ke detail inquiry" />);
    expect(screen.getByRole("link", { name: "Kembali ke detail inquiry" })).toBeVisible();
  });
});
