"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, ShieldCheck, UserRound } from "lucide-react";
import type { AdminRole } from "@/generated/prisma/client";
import { postAdminAuth } from "./admin-auth-form";
import { navigateAfterAdminAuth } from "./admin-auth-navigation";
import { useHydrated } from "./use-hydrated";
import { isPointerInteraction, useAdminExitPresence, useAdminPointerPress, useAdminReducedMotion } from "./admin-interaction-motion";
import motion from "./admin-interaction-motion.module.css";

type Identity = Readonly<{ name: string; email: string | null; role: AdminRole }>;

export function AdminAccountMenu({ role }: Readonly<{ role: AdminRole }>) {
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [pointerMotion, setPointerMotion] = useState(false);
  const reducedMotion = useAdminReducedMotion();
  const animate = pointerMotion && !reducedMotion;
  const present = useAdminExitPresence(open, animate);
  const press = useAdminPointerPress();
  const hydrated = useHydrated();
  const menu = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/account", { cache: "no-store", signal: controller.signal })
      .then(response => response.ok ? response.json() as Promise<Identity> : null)
      .then(value => { if (!controller.signal.aborted && value !== null) setIdentity(value); })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (!open) return;
    function dismiss(event: MouseEvent) {
      if (!menu.current?.contains(event.target as Node)) {
        if (menu.current?.contains(document.activeElement)) menu.current.querySelector("button")?.focus();
        setPointerMotion(isPointerInteraction(event));
        setOpen(false);
      }
    }
    function escape(event: KeyboardEvent) { if (event.key === "Escape") { setPointerMotion(false); setOpen(false); menu.current?.querySelector("button")?.focus(); } }
    document.addEventListener("mousedown", dismiss);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", dismiss); document.removeEventListener("keydown", escape); };
  }, [open]);
  const name = identity?.name ?? (role === "OWNER" ? "Owner Niuva" : "Admin Niuva");
  async function logout() {
    setBusy(true); setError("");
    try { await postAdminAuth("/sign-out", {}); navigateAfterAdminAuth("/admin/sign-in"); }
    catch { setError("Keluar belum berhasil. Coba lagi."); setBusy(false); }
  }
  return <div className="relative" ref={menu}>
    <button {...press} aria-expanded={open} className={`${motion.accountTrigger} ${motion.press} flex min-h-11 items-center gap-2 rounded-lg px-1 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-75 sm:px-2`} data-motion={animate} disabled={!hydrated} onClick={event => { if (open) menu.current?.querySelector("button")?.focus(); setPointerMotion(isPointerInteraction(event.nativeEvent)); setOpen(value => !value); }} type="button">
      <span aria-hidden="true" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">{name.trim().charAt(0).toLocaleUpperCase("id-ID") || "A"}</span>
      <span className="hidden max-w-36 min-w-0 text-left sm:block"><strong className="block truncate text-xs">{name}</strong><span className="block text-[11px] text-muted-foreground">{role === "OWNER" ? "Owner" : "Admin"}</span></span>
      <ChevronDown aria-hidden="true" className={`${motion.chevron} hidden size-4 text-muted-foreground sm:block`} data-open={open} />
      <span className="sr-only">Buka menu akun {name}</span>
    </button>
    {present ? <div aria-hidden={!open || undefined} className={`${motion.accountPanel} absolute right-0 z-40 mt-2 w-64 rounded-xl border border-border bg-card p-2 shadow-floating`} data-exiting={!open} data-motion={animate} inert={!open}>
      <div className="border-b border-border px-3 py-2"><p className="truncate text-sm font-semibold">{name}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{identity?.email ?? (role === "OWNER" ? "Owner" : "Admin")}</p></div>
      <Link className="mt-1 flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/admin/account" onClick={event => { menu.current?.querySelector("button")?.focus(); setPointerMotion(isPointerInteraction(event.nativeEvent)); setOpen(false); }}><UserRound aria-hidden="true" className="size-4" />Akun saya</Link>
      <Link className="flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/admin/security" onClick={event => { menu.current?.querySelector("button")?.focus(); setPointerMotion(isPointerInteraction(event.nativeEvent)); setOpen(false); }}><ShieldCheck aria-hidden="true" className="size-4" />Keamanan akun</Link>
      <button className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50" disabled={busy} onClick={() => void logout()} type="button"><LogOut aria-hidden="true" className="size-4" />{busy ? "Keluar…" : "Keluar"}</button>
      {error ? <p role="alert" className="px-3 py-1 text-xs text-destructive-icon">{error}</p> : null}
    </div> : null}
  </div>;
}
