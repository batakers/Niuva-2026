"use client";

import { useEffect, useState, type MouseEvent } from "react";
import Link from "next/link";
import { BellRing, X } from "lucide-react";
import type { AdminNotificationItem } from "@/modules/admin/notifications/types";
import { useAdminExitPresence, useAdminPointerPress, useAdminReducedMotion } from "./admin-interaction-motion";
import motion from "./admin-interaction-motion.module.css";

export function AdminNotificationToast({ items, overflow, dismiss, openPanel, visit, motionEnabled = true }: Readonly<{
  items: readonly AdminNotificationItem[];
  overflow: number;
  dismiss: (event?: MouseEvent<HTMLElement>) => void;
  openPanel: (event: MouseEvent<HTMLButtonElement>) => void;
  visit: (id: string, event: MouseEvent<HTMLAnchorElement>) => void;
  motionEnabled?: boolean;
}>) {
  const [paused, setPaused] = useState(false);
  const [snapshot, setSnapshot] = useState({ items, overflow });
  if (items.length && (snapshot.items !== items || snapshot.overflow !== overflow)) {
    setSnapshot({ items, overflow });
  }
  const reducedMotion = useAdminReducedMotion();
  const animate = motionEnabled && !reducedMotion;
  const present = useAdminExitPresence(items.length > 0, animate);
  const press = useAdminPointerPress();
  const displayed = items.length ? { items, overflow } : snapshot;
  useEffect(() => {
    if (!items.length || paused) return;
    const timer = window.setTimeout(dismiss, 12_000);
    return () => window.clearTimeout(timer);
  }, [items, paused, dismiss]);
  return <aside aria-label="Pemberitahuan baru" aria-live="polite" aria-relevant="additions" className="fixed bottom-4 right-4 z-50 grid w-96 max-w-[calc(100vw-2rem)] gap-2" data-testid="notification-toasts" onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
    {present ? <div aria-hidden={!items.length || undefined} className={`${motion.toastStack} grid gap-2`} data-exiting={!items.length} data-motion={animate} inert={!items.length}>
      <div className="flex items-center justify-between rounded-lg bg-foreground px-3 text-background"><span className="text-xs font-medium">Perlu perhatian</span><button {...press} aria-label="Tutup pemberitahuan baru" className={`${motion.press} flex size-11 items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring`} onClick={dismiss} type="button"><X aria-hidden="true" className="size-4" /></button></div>
      {displayed.items.map(item => <div className="rounded-xl bg-card p-4 shadow-floating ring-1 ring-border" key={item.id}><p className="flex items-center gap-2 text-xs text-muted-foreground"><BellRing aria-hidden="true" className="size-4 text-brand-700" />{item.group}</p><p className="mt-2 text-sm font-semibold">{item.title}</p>{item.href ? <Link className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={item.href} onClick={event => visit(item.id, event)}>Buka detail</Link> : null}</div>)}
      {displayed.overflow ? <button className="min-h-11 rounded-lg bg-card px-4 text-left text-sm font-semibold text-brand-700 shadow-floating focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" onClick={openPanel} type="button">{displayed.overflow} pemberitahuan lainnya — buka panel</button> : null}
    </div> : null}
  </aside>;
}
