"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Popover } from "@base-ui/react/popover";
import { Bell, Check, RefreshCw, X } from "lucide-react";
import { z } from "zod";
import type { AdminNotificationItem, NotificationFeed } from "@/modules/admin/notifications/types";
import { AdminNotificationToast } from "./admin-notification-toast";
import { useHydrated } from "./use-hydrated";

const feedSchema = z.object({
  items: z.array(z.object({ id: z.uuid(), title: z.string(), group: z.string(), href: z.string().nullable(), createdAt: z.iso.datetime(), isRead: z.boolean(), requiresAttention: z.boolean() })),
  unreadCount: z.number().int().nonnegative(), nextCursor: z.string().nullable(),
  toastCandidates: z.array(z.object({ id: z.uuid(), title: z.string(), group: z.string(), href: z.string().nullable(), createdAt: z.iso.datetime(), isRead: z.boolean(), requiresAttention: z.boolean() })),
});
const time = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });

export function AdminNotificationCenter() {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const [feed, setFeed] = useState<NotificationFeed | null>(null);
  const [toasts, setToasts] = useState<readonly AdminNotificationItem[]>([]);
  const [overflow, setOverflow] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [reading, setReading] = useState<string | null>(null);
  const filter = useRef(false);
  const refresh = useRef<(cursor?: string | null) => void>(() => {});
  const dismiss = useCallback(() => { setToasts([]); setOverflow(0); }, []);

  useEffect(() => {
    let disposed = false, initialized = false, failures = 0, busy = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;
    async function load(cursor?: string | null) {
      if (disposed || busy || document.visibilityState === "hidden") return;
      busy = true; setLoading(true); clearTimeout(timer);
      controller = new AbortController();
      try {
        const response = await fetch("/api/admin/notifications", { method: "POST", cache: "no-store", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operation: initialized ? "poll" : "bootstrap", cursor, unread: filter.current }), signal: controller.signal });
        if (!response.ok) throw new Error("Notification unavailable");
        const result = feedSchema.parse(await response.json());
        if (disposed) return;
        initialized = true; failures = 0; setError("");
        setFeed(previous => ({ ...result, items: cursor && previous ? [...previous.items, ...result.items.filter(item => !previous.items.some(old => old.id === item.id))] : result.items }));
        if (result.toastCandidates.length) {
          setToasts(previous => [...previous, ...result.toastCandidates].slice(-3));
          setOverflow(previous => previous + Math.max(0, result.toastCandidates.length - 3));
        }
      } catch {
        if (!disposed && !controller.signal.aborted) { failures += 1; setError("Notifikasi belum dapat diperbarui. Coba lagi."); }
      } finally {
        busy = false;
        if (!disposed) { setLoading(false); timer = setTimeout(() => void load(), failures ? Math.min(60_000, 30_000 * failures) : 15_000); }
      }
    }
    refresh.current = cursor => { void load(cursor); };
    const resume = () => { if (document.visibilityState === "visible") void load(); else clearTimeout(timer); };
    void load();
    document.addEventListener("visibilitychange", resume); window.addEventListener("focus", resume);
    return () => { disposed = true; clearTimeout(timer); controller?.abort(); refresh.current = () => {}; document.removeEventListener("visibilitychange", resume); window.removeEventListener("focus", resume); };
  }, []);

  async function markRead(id: string) {
    setReading(id);
    try {
      const response = await fetch("/api/admin/notifications/read", { method: "POST", cache: "no-store", keepalive: true, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids: [id] }) });
      if (!response.ok) throw new Error("Read unavailable");
      setFeed(previous => previous ? { ...previous, unreadCount: Math.max(0, previous.unreadCount - (previous.items.some(item => item.id === id && !item.isRead) ? 1 : 0)), items: previous.items.map(item => item.id === id ? { ...item, isRead: true } : item) } : previous);
    } catch { setError("Status baca belum tersimpan. Coba tandai lagi dari panel."); }
    finally { setReading(null); }
  }
  function changeFilter(value: boolean) { filter.current = value; setUnread(value); refresh.current(); }
  const visible = unread ? feed?.items.filter(item => !item.isRead) : feed?.items;
  return <>
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger aria-label={`Buka notifikasi${feed?.unreadCount ? `, ${feed.unreadCount} belum dibaca` : ""}`} className="relative inline-flex size-11 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60" disabled={!hydrated} data-feed-ready={feed ? "true" : "false"}>
        <Bell aria-hidden="true" className="size-5" />{feed?.unreadCount ? <span aria-hidden="true" className="absolute -right-1 -top-1 min-w-5 rounded-full bg-brand-700 px-1 text-center text-[10px] font-semibold leading-5 text-white">{feed.unreadCount > 99 ? "99+" : feed.unreadCount}</span> : null}
      </Popover.Trigger>
      <Popover.Portal><Popover.Positioner sideOffset={10} align="end" collisionPadding={16} className="z-50"><Popover.Popup aria-label="Notifikasi" className="w-96 max-w-[calc(100vw-2rem)] rounded-xl bg-card text-foreground shadow-floating ring-1 ring-border outline-none">
        <div className="flex items-start justify-between gap-3 px-5 pt-4"><div><Popover.Title className="text-lg font-semibold">Notifikasi</Popover.Title><Popover.Description className="mt-1 text-xs leading-5 text-muted-foreground">Riwayat aktivitas. Dibaca tidak mengubah status pekerjaan.</Popover.Description></div><Popover.Close aria-label="Tutup notifikasi" className="flex size-11 shrink-0 items-center justify-center rounded-lg hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><X aria-hidden="true" className="size-4" /></Popover.Close></div>
        <div className="flex gap-1 border-b border-border px-4 py-3" aria-label="Filter notifikasi">{[false, true].map(value => <button aria-pressed={unread === value} className={`min-h-11 rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${unread === value ? "bg-brand-50 text-brand-900" : "text-muted-foreground hover:bg-muted"}`} key={String(value)} onClick={() => changeFilter(value)} type="button">{value ? "Belum dibaca" : "Semua"}</button>)}</div>
        {error ? <div className="px-5 py-3"><p className="text-xs text-destructive-icon" role="status">{error}</p><button className="mt-1 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700 disabled:opacity-50" disabled={loading} onClick={() => refresh.current()} type="button"><RefreshCw aria-hidden="true" className="size-4" />Coba lagi</button></div> : null}
        <div aria-busy={loading} className="max-h-[55dvh] overflow-y-auto overscroll-contain px-5">
          {!feed && !error ? <p className="py-8 text-sm text-muted-foreground">Memuat aktivitas…</p> : null}
          {feed && !visible?.length ? <p className="py-8 text-sm text-muted-foreground">{unread ? "Semua notifikasi sudah dibaca." : "Belum ada aktivitas."}</p> : null}
          <ul className="divide-y divide-border">{visible?.map(item => <li className="py-3" key={item.id}><div className="flex items-start gap-3"><span aria-hidden="true" className={`mt-2 size-2 shrink-0 rounded-full ${item.isRead ? "bg-neutral-300" : "bg-brand-700"}`} /><div className="min-w-0 flex-1">{item.href ? <Link className="block rounded text-sm font-semibold hover:text-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={item.href} onClick={() => { void markRead(item.id); setOpen(false); }}>{item.title}</Link> : <p className="text-sm font-medium">{item.title}</p>}<p className="mt-1 text-xs leading-5 text-muted-foreground">{item.group} · {time.format(new Date(item.createdAt))} WIB</p>{!item.href ? <p className="text-xs text-muted-foreground">Record sudah tidak tersedia.</p> : null}{!item.isRead ? <button aria-label="Tandai dibaca" className="mt-1 inline-flex min-h-11 items-center gap-1 text-xs font-medium text-brand-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" disabled={reading === item.id} onClick={() => void markRead(item.id)} type="button"><Check aria-hidden="true" className="size-3" />{reading === item.id ? "Menyimpan…" : "Tandai dibaca"}</button> : <span className="mt-1 block text-xs text-muted-foreground">Dibaca</span>}</div></div></li>)}</ul>
          {feed?.nextCursor ? <button className="my-2 min-h-11 w-full rounded-lg border border-border text-sm font-medium disabled:opacity-50" disabled={loading} onClick={() => refresh.current(feed.nextCursor)} type="button">Muat aktivitas sebelumnya</button> : null}
        </div>
        <Link className="flex min-h-12 items-center justify-center rounded-b-xl border-t border-border text-sm font-semibold text-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/admin/activity" onClick={() => setOpen(false)}>Lihat semua aktivitas</Link>
      </Popover.Popup></Popover.Positioner></Popover.Portal>
    </Popover.Root>
    <AdminNotificationToast dismiss={dismiss} items={toasts} overflow={overflow} openPanel={() => { dismiss(); setOpen(true); }} visit={id => { void markRead(id); dismiss(); }} />
  </>;
}
