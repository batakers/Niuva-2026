"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, X } from "lucide-react";
import type { AdminNotificationItem } from "@/modules/admin/notifications/types";

export function AdminNotificationToast({ items, overflow, dismiss, openPanel, visit }: Readonly<{
  items: readonly AdminNotificationItem[];
  overflow: number;
  dismiss: () => void;
  openPanel: () => void;
  visit: (id: string) => void;
}>) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (!items.length || paused) return;
    const timer = window.setTimeout(dismiss, 12_000);
    return () => window.clearTimeout(timer);
  }, [items, paused, dismiss]);
  return <aside aria-label="Pemberitahuan baru" aria-live="polite" aria-relevant="additions" className="fixed bottom-4 right-4 z-50 grid w-96 max-w-[calc(100vw-2rem)] gap-2" data-testid="notification-toasts" onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    {items.length ? <>
      <div className="flex items-center justify-between rounded-lg bg-foreground px-3 text-background"><span className="text-xs font-medium">Perlu perhatian</span><button aria-label="Tutup pemberitahuan baru" className="flex size-11 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring" onClick={dismiss} type="button"><X aria-hidden="true" className="size-4" /></button></div>
      {items.map(item => <div className="rounded-xl bg-card p-4 shadow-floating ring-1 ring-border" key={item.id}><p className="flex items-center gap-2 text-xs text-muted-foreground"><BellRing aria-hidden="true" className="size-4 text-brand-700" />{item.group}</p><p className="mt-2 text-sm font-semibold">{item.title}</p>{item.href ? <Link className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={item.href} onClick={() => visit(item.id)}>Buka detail</Link> : null}</div>)}
      {overflow ? <button className="min-h-11 rounded-lg bg-card px-4 text-left text-sm font-semibold text-brand-700 shadow-floating focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" onClick={openPanel} type="button">{overflow} pemberitahuan lainnya — buka panel</button> : null}
    </> : null}
  </aside>;
}
