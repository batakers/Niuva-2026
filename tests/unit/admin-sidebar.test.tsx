import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminShell } from "@/components/niuva/admin-shell";

vi.mock("@/components/niuva/admin-session-actions", () => ({ AdminSessionActions: () => null }));

const preferenceKey = "niuva.admin.sidebar.v1";
beforeEach(() => { window.localStorage.clear(); });

describe("desktop Admin navigation preference", () => {
  it("separates Owner operations from management", () => {
    render(<AdminShell active="privacy" role="OWNER"><main>Privacy</main></AdminShell>);
    const owner = screen.getByRole("navigation", { name: "Owner" });
    expect(within(owner).getByRole("link", { name: "Privasi Customer" })).toHaveAttribute("aria-current", "page");
    expect(within(owner).getByRole("link", { name: "Tambah Admin" })).toHaveAttribute("href", "/admin/admins/new");
    expect(within(screen.getByRole("navigation", { name: "Kelola" })).queryByRole("link", { name: "Privasi Customer" })).not.toBeInTheDocument();
  });
  it("hides Owner navigation from Admin", () => {
    render(<AdminShell active="orders" role="ADMIN"><main>Orders</main></AdminShell>);
    expect(screen.queryByRole("navigation", { name: "Owner" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Tambah Admin" })).not.toBeInTheDocument();
  });
  it("starts expanded and preserves accessible routes when collapsed", async () => {
    render(<AdminShell active="overview" role="OWNER"><main>Overview content</main></AdminShell>);
    const sidebar = screen.getByRole("complementary", { name: "Navigasi Admin" });
    const header = screen.getByRole("banner", { name: "Niuva Admin" });
    const toggle = within(sidebar).getByRole("button", { name: "Lipat navigasi Admin" });
    expect(within(header).queryByRole("button", { name: "Lipat navigasi Admin" })).not.toBeInTheDocument();
    expect(within(sidebar).queryByRole("link", { name: "Situs publik" })).not.toBeInTheDocument();
    const publicSite = within(header).getAllByRole("link", { name: "Situs publik" })
      .find((link) => link.closest("details") === null);
    expect(publicSite).toHaveAttribute("href", "/");
    expect(publicSite).not.toHaveAttribute("target");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", "admin-desktop-sidebar");
    act(() => { toggle.focus(); });
    fireEvent.click(toggle);
    expect(toggle).toHaveFocus();
    expect(screen.getByRole("button", { name: "Perluas navigasi Admin" })).toHaveAttribute("aria-expanded", "false");
    expect(window.localStorage.getItem(preferenceKey)).toBe("collapsed");
    act(() => { toggle.blur(); });
    const navigation = screen.getByRole("navigation", { name: "Operasional" });
    expect(within(navigation).getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    const queue = within(navigation).getByRole("link", { name: "Action Queue" });
    expect(queue).toHaveAttribute("href", "/admin/queue");
    fireEvent.keyDown(document, { key: "Tab" });
    act(() => { queue.focus(); });
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Action Queue");
    act(() => { queue.blur(); });
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
    fireEvent.mouseEnter(queue);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Action Queue");
    fireEvent.mouseLeave(queue);
  });

  it("names the rail footer control on focus and dismisses its tooltip with Escape", async () => {
    window.localStorage.setItem(preferenceKey, "collapsed");
    render(<AdminShell active="overview" role="OWNER"><main>Overview</main></AdminShell>);
    const sidebar = screen.getByRole("complementary", { name: "Navigasi Admin" });
    const toggle = within(sidebar).getByRole("button", { name: "Perluas navigasi Admin" });
    fireEvent.keyDown(document, { key: "Tab" });
    act(() => { toggle.focus(); });
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Perluas navigasi Admin");
    fireEvent.keyDown(toggle, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("tooltip")).not.toBeInTheDocument());
    expect(toggle).toHaveFocus();
    fireEvent.click(toggle);
    expect(toggle).toHaveFocus();
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(within(sidebar).getByRole("button", { name: "Lipat navigasi Admin" })).toBe(toggle);
  });

  it("restores the choice on another route and responds to browser storage changes", async () => {
    window.localStorage.setItem(preferenceKey, "collapsed");
    const first = render(<AdminShell active="overview" role="OWNER"><main>First page</main></AdminShell>);
    expect(screen.getByRole("button", { name: "Perluas navigasi Admin" })).toHaveAttribute("aria-expanded", "false");
    first.unmount();
    render(<AdminShell active="queue" role="OWNER"><main>Queue page</main></AdminShell>);
    const navigation = screen.getByRole("navigation", { name: "Operasional" });
    expect(within(navigation).getByRole("link", { name: "Action Queue" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Perluas navigasi Admin" })).toHaveAttribute("aria-expanded", "false");
    window.localStorage.setItem(preferenceKey, "expanded");
    fireEvent(window, new StorageEvent("storage", { key: preferenceKey }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Lipat navigasi Admin" })).toHaveAttribute("aria-expanded", "true"));
    expect(screen.getByText("Menu Admin").closest("details")).not.toHaveAttribute("open");
  });

  it("uses the expanded default for an invalid stored choice", () => {
    window.localStorage.setItem(preferenceKey, "invalid");
    render(<AdminShell active="orders" role="ADMIN"><main>Orders</main></AdminShell>);
    expect(screen.getByRole("button", { name: "Lipat navigasi Admin" })).toHaveAttribute("aria-expanded", "true");
  });

  it("still toggles when the browser refuses storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    render(<AdminShell active="overview" role="OWNER"><main>Overview</main></AdminShell>);
    fireEvent.click(screen.getByRole("button", { name: "Lipat navigasi Admin" }));
    expect(screen.getByRole("button", { name: "Perluas navigasi Admin" })).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(screen.getByRole("button", { name: "Perluas navigasi Admin" }));
    expect(screen.getByRole("button", { name: "Lipat navigasi Admin" })).toHaveAttribute("aria-expanded", "true");
  });
});
