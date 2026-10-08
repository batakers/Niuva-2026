import { StrictMode } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminListPosition } from "@/components/niuva/admin-list-position";

afterEach(() => { cleanup(); sessionStorage.clear(); vi.restoreAllMocks(); });
const list = "/admin/orders?q=ORD-TEST&status=PAID&page=2";
const detail = `/admin/orders/fixture?returnTo=${encodeURIComponent(list)}`;
function view() { return render(<main><AdminListPosition listHref={list} /><a href={detail} onClick={event => event.preventDefault()}>ORD-TEST</a></main>); }

describe("list return position", () => {
  it("retains the record when navigation moves focus after the first restore, without overriding user input", () => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.push(callback); return frames.length; });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
    sessionStorage.setItem(`niuva:admin-list:${list}`, JSON.stringify({ href: detail, top: 480, savedAt: Date.now() }));
    const result = render(<main tabIndex={-1}><AdminListPosition listHref={list} /><a href={detail}>Record</a><input aria-label="New search" /></main>);
    act(() => frames.shift()?.(0));
    result.container.querySelector("main")?.focus();
    act(() => frames.shift()?.(0)); expect(result.getByRole("link")).toHaveFocus();
    result.getByRole("textbox").focus(); fireEvent.keyDown(result.getByRole("textbox"), { key: "a" });
    act(() => frames.shift()?.(0)); expect(result.getByRole("textbox")).toHaveFocus();
  });
  it("restores the selected record and scroll position after detail navigation", () => {
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    vi.spyOn(window, "scrollY", "get").mockReturnValue(480);
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { callback(0); return 1; });
    const first = view(); fireEvent.click(first.getByRole("link")); first.unmount();
    const second = view();
    expect(second.getByRole("link")).toHaveFocus();
    expect(scroll).toHaveBeenCalledWith({ top: 480, behavior: "instant" });
  });
  it("keeps links usable when session storage is denied and ignores new-tab clicks", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new DOMException("Denied", "SecurityError"); });
    const save = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new DOMException("Denied", "SecurityError"); });
    const screen = view();
    expect(() => fireEvent.click(screen.getByRole("link"))).not.toThrow();
    expect(screen.getByRole("link")).toHaveAttribute("href", detail);
    save.mockClear(); fireEvent.click(screen.getByRole("link"), { ctrlKey: true });
    expect(save).not.toHaveBeenCalled();
  });
  it("survives the development effect cleanup before the restore frame runs", () => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const frames = new Map<number, FrameRequestCallback>(); let id = 0;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => { frames.set(++id, callback); return id; });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(key => { frames.delete(key); });
    const first = view(); fireEvent.click(first.getByRole("link")); first.unmount();
    const second = render(<StrictMode><main><AdminListPosition listHref={list} /><a href={detail}>ORD-TEST</a></main></StrictMode>);
    act(() => { for (const callback of frames.values()) callback(0); });
    expect(second.getByRole("link")).toHaveFocus();
  });
});
