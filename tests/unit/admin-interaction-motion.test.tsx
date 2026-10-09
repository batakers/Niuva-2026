import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminAccountMenu } from "@/components/niuva/admin-account-menu";
import { AdminNotificationToast } from "@/components/niuva/admin-notification-toast";
import { AdminNotificationCenter } from "@/components/niuva/admin-notification-center";
import type { AdminNotificationItem } from "@/modules/admin/notifications/types";

const first: AdminNotificationItem = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Brief B2B baru diterima",
  group: "B2B",
  href: "/admin/inquiries/first",
  createdAt: "2026-10-08T10:00:00.000Z",
  isRead: false,
  requiresAttention: true,
};
const second: AdminNotificationItem = {
  ...first,
  id: "00000000-0000-4000-8000-000000000002",
  title: "Custom Print baru memerlukan review",
  href: "/admin/custom-print/second",
};

function mediaPreference(initial = false) {
  let reduced = initial;
  const subscribers = new Set<() => void>();
  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() { return query.includes("prefers-reduced-motion") && reduced; },
    media: query,
    onchange: null,
    addEventListener: (_type: string, listener: () => void) => { subscribers.add(listener); },
    removeEventListener: (_type: string, listener: () => void) => { subscribers.delete(listener); },
    addListener: (listener: () => void) => { subscribers.add(listener); },
    removeListener: (listener: () => void) => { subscribers.delete(listener); },
    dispatchEvent: () => true,
  }));
  return (value: boolean) => act(() => {
    reduced = value;
    subscribers.forEach(listener => listener());
  });
}

async function tick(ms = 0) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms); });
}

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Admin motion preserves interaction during transitions", () => {
  it("dismisses attention immediately with the keyboard and restores focus to the bell", async () => {
    mediaPreference();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(Response.json({ items: [], unreadCount: 0, nextCursor: null, toastCandidates: [] }))
      .mockResolvedValue(Response.json({ items: [first], unreadCount: 1, nextCursor: null, toastCandidates: [first] })));
    render(<AdminNotificationCenter />);
    await tick();
    window.dispatchEvent(new Event("focus"));
    await tick();
    const close = screen.getByRole("button", { name: "Tutup pemberitahuan baru" });
    close.focus();

    fireEvent.click(close, { detail: 0 });

    expect(screen.queryByText(first.title)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Buka notifikasi/ })).toHaveFocus();
  });

  it("retains a dismissed toast for its exit while removing its actions from navigation", async () => {
    mediaPreference();
    const props = { overflow: 0, dismiss: vi.fn(), openPanel: vi.fn(), visit: vi.fn() };
    const view = render(<AdminNotificationToast {...props} items={[first]} />);

    view.rerender(<AdminNotificationToast {...props} items={[]} />);

    expect(screen.getByText(first.title)).toBeInTheDocument();
    expect(screen.getByText(first.title).closest("[inert]")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Buka detail" })).not.toBeInTheDocument();
    await tick(200);
    expect(screen.queryByText(first.title)).not.toBeInTheDocument();
  });

  it("cancels an interrupted toast exit and shows only the newest attention items", async () => {
    mediaPreference();
    const props = { overflow: 0, dismiss: vi.fn(), openPanel: vi.fn(), visit: vi.fn() };
    const view = render(<AdminNotificationToast {...props} items={[first]} />);
    view.rerender(<AdminNotificationToast {...props} items={[]} />);
    await tick(50);
    view.rerender(<AdminNotificationToast {...props} items={[second]} />);

    expect(screen.queryByText(first.title)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Buka detail" })).toHaveAttribute("href", second.href);
    await tick(200);
    expect(screen.getByText(second.title)).toBeInTheDocument();
    expect(screen.getByText(second.title).closest("[inert]")).toBeNull();
  });

  it("removes toasts immediately when reduced motion is enabled during their exit", async () => {
    const setReduced = mediaPreference();
    const props = { overflow: 0, dismiss: vi.fn(), openPanel: vi.fn(), visit: vi.fn() };
    const view = render(<AdminNotificationToast {...props} items={[first]} />);
    view.rerender(<AdminNotificationToast {...props} items={[]} />);
    expect(screen.getByText(first.title)).toBeInTheDocument();

    setReduced(true);

    expect(screen.queryByText(first.title)).not.toBeInTheDocument();
    setReduced(false);
    expect(screen.queryByText(first.title)).not.toBeInTheDocument();
    await tick(200);
    expect(screen.queryByText(first.title)).not.toBeInTheDocument();
  });

  it("keeps a pointer-closed account menu inert until the exit finishes", async () => {
    mediaPreference();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ name: "Owner Uji", email: "owner@example.test", role: "OWNER" })));
    render(<AdminAccountMenu role="OWNER" />);
    await tick();
    const trigger = screen.getByRole("button", { name: /Buka menu akun Owner Uji/ });
    fireEvent.click(trigger, { detail: 1 });
    expect(screen.getByRole("link", { name: "Akun saya" })).toBeInTheDocument();

    fireEvent.click(trigger, { detail: 1 });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Akun saya").closest("[inert]")).not.toBeNull();
    expect(screen.queryByRole("link", { name: "Akun saya" })).not.toBeInTheDocument();
    await tick(200);
    expect(screen.queryByText("Akun saya")).not.toBeInTheDocument();
  });

  it("does not let an old account-menu exit remove a newly closing menu", async () => {
    mediaPreference();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ name: "Owner Uji", email: null, role: "OWNER" })));
    render(<AdminAccountMenu role="OWNER" />);
    await tick();
    const trigger = screen.getByRole("button", { name: /Buka menu akun Owner Uji/ });
    fireEvent.click(trigger, { detail: 1 });
    fireEvent.click(trigger, { detail: 1 });
    await tick(50);
    fireEvent.click(trigger, { detail: 1 });
    fireEvent.click(trigger, { detail: 1 });
    await tick(110);

    expect(screen.getByText("Akun saya")).toBeInTheDocument();
    await tick(60);
    expect(screen.queryByText("Akun saya")).not.toBeInTheDocument();
  });

  it("closes the account menu immediately on Escape and returns focus to the trigger", async () => {
    mediaPreference();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ name: "Owner Uji", email: null, role: "OWNER" })));
    render(<AdminAccountMenu role="OWNER" />);
    await tick();
    const trigger = screen.getByRole("button", { name: /Buka menu akun Owner Uji/ });
    fireEvent.click(trigger, { detail: 1 });
    screen.getByRole("link", { name: "Akun saya" }).focus();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByText("Akun saya")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("does not leave keyboard focus inside an account menu dismissed by an outside pointer", async () => {
    mediaPreference();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ name: "Owner Uji", email: null, role: "OWNER" })));
    render(<AdminAccountMenu role="OWNER" />);
    await tick();
    const trigger = screen.getByRole("button", { name: /Buka menu akun Owner Uji/ });
    fireEvent.click(trigger, { detail: 1 });
    screen.getByRole("link", { name: "Akun saya" }).focus();

    fireEvent.mouseDown(document.body);

    expect(document.activeElement?.closest("[inert]")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("keeps keyboard toggles immediate even after a pointer opened the account menu", async () => {
    mediaPreference();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ name: "Owner Uji", email: null, role: "OWNER" })));
    render(<AdminAccountMenu role="OWNER" />);
    await tick();
    const trigger = screen.getByRole("button", { name: /Buka menu akun Owner Uji/ });
    fireEvent.click(trigger, { detail: 1 });

    fireEvent.click(trigger, { detail: 0 });

    expect(screen.queryByText("Akun saya")).not.toBeInTheDocument();
  });
});
