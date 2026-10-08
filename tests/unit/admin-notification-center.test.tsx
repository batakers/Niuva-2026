import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminNotificationCenter } from "@/components/niuva/admin-notification-center";

const emptyFeed = { items: [], unreadCount: 0, nextCursor: null, toastCandidates: [] };
async function tick(ms = 0) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("notification delivery lifecycle", () => {
  it("pauses hidden tabs, resumes on focus, and cancels requests on unmount", async () => {
    vi.useFakeTimers();
    let visibility = "visible";
    vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility as DocumentVisibilityState);
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(Response.json(emptyFeed)));
    vi.stubGlobal("fetch", fetcher);
    const view = render(<AdminNotificationCenter />);
    await tick(); expect(fetcher).toHaveBeenCalledTimes(1);
    visibility = "hidden"; document.dispatchEvent(new Event("visibilitychange"));
    await tick(60_000); expect(fetcher).toHaveBeenCalledTimes(1);
    visibility = "visible"; window.dispatchEvent(new Event("focus"));
    await tick(); expect(fetcher).toHaveBeenCalledTimes(2);
    const signal = fetcher.mock.calls[1]?.[1]?.signal as AbortSignal;
    view.unmount(); expect(signal.aborted).toBe(true);
    await tick(60_000); expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("backs off failed polling while the bell remains usable", async () => {
    vi.useFakeTimers();
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("visible");
    const fetcher = vi.fn().mockRejectedValue(new Error("offline"));
    vi.stubGlobal("fetch", fetcher);
    render(<AdminNotificationCenter />); await tick();
    expect(screen.getByRole("button", { name: "Buka notifikasi" })).toBeEnabled();
    await tick(15_000); expect(fetcher).toHaveBeenCalledTimes(1);
    await tick(15_000); expect(fetcher).toHaveBeenCalledTimes(2);
    await tick(59_000); expect(fetcher).toHaveBeenCalledTimes(2);
    await tick(1000); expect(fetcher).toHaveBeenCalledTimes(3);
  });
});
