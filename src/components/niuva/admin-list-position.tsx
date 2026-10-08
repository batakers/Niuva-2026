"use client";

import { useEffect } from "react";
import { z } from "zod";
import { useHydrated } from "./use-hydrated";
import { normalizeAdminReturnTo } from "@/modules/admin/navigation";

const snapshotSchema = z.object({ href: z.string().max(2000), top: z.number().finite().min(0).max(1_000_000), savedAt: z.number().finite() }).strict();

/** Per-tab enhancement; ordinary anchors/history keep working without storage. */
export function AdminListPosition({ listHref }: Readonly<{ listHref: string }>) {
  const hydrated = useHydrated();
  useEffect(() => {
    if (normalizeAdminReturnTo(listHref, "/admin") !== listHref) return;
    const key = `niuva:admin-list:${listHref}`;
    let frame: number | undefined;
    let interrupted = false;
    const interrupt = () => { interrupted = true; if (frame !== undefined) cancelAnimationFrame(frame); };
    try {
      const raw = sessionStorage.getItem(key);
      const parsed = raw ? snapshotSchema.safeParse(JSON.parse(raw)) : null;
      if (parsed?.success && Date.now() - parsed.data.savedAt < 30 * 60_000) {
        const snapshot = parsed.data;
        let remainingFrames = 3;
        const restore = () => {
          if (interrupted) return;
          const candidates = [...document.querySelectorAll<HTMLAnchorElement>("main a[href]")].filter(anchor => anchor.getAttribute("href") === snapshot.href);
          const link = candidates.find(anchor => anchor.getClientRects().length > 0) ?? candidates[0];
          if (link) { link.focus({ preventScroll: true }); window.scrollTo({ top: snapshot.top, behavior: "instant" }); }
          // Next also manages focus after a route commit. A bounded follow-up
          // keeps the saved record selected; any user interaction cancels it.
          if (--remainingFrames > 0) frame = requestAnimationFrame(restore);
          else if (link) { try { sessionStorage.removeItem(key); } catch { /* Storage may be disabled. */ } }
        };
        frame = requestAnimationFrame(restore);
      }
    } catch { /* Storage denial must not prevent navigation. */ }
    function save(event: MouseEvent) {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return;
      const anchor = event.target.closest<HTMLAnchorElement>("main a[href]");
      if (!anchor || anchor.target === "_blank" || anchor.origin !== window.location.origin) return;
      const destination = new URL(anchor.href);
      if (destination.searchParams.get("returnTo") !== listHref) return;
      try { sessionStorage.setItem(key, JSON.stringify({ href: anchor.getAttribute("href"), top: Math.max(0, window.scrollY), savedAt: Date.now() })); } catch { /* Native history remains available. */ }
    }
    document.addEventListener("click", save, true);
    document.addEventListener("pointerdown", interrupt, true);
    document.addEventListener("keydown", interrupt, true);
    document.addEventListener("wheel", interrupt, true);
    return () => { interrupt(); document.removeEventListener("click", save, true); document.removeEventListener("pointerdown", interrupt, true); document.removeEventListener("keydown", interrupt, true); document.removeEventListener("wheel", interrupt, true); };
  }, [listHref]);
  return <span hidden data-admin-list-position-ready={hydrated ? "true" : "false"} />;
}
