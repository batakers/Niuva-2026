"use client";

import { Label } from "@/components/ui/label";
import { NativeInput as Input } from "@/components/ui/input";
import { useEffect, useRef } from "react";
import { Search } from "lucide-react";

export function AdminGlobalSearch() {
  const input = useRef<HTMLInputElement>(null);
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") { event.preventDefault(); input.current?.focus(); }
      if (event.key === "Escape" && document.activeElement === input.current) input.current?.blur();
    }
    window.addEventListener("keydown", onKeyDown);
    const element = form.current;
    element?.setAttribute("data-shortcut-ready", "true");
    return () => { window.removeEventListener("keydown", onKeyDown); element?.setAttribute("data-shortcut-ready", "false"); };
  }, []);
  return <form action="/admin/search" data-shortcut-ready="false" ref={form} className="flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-neutral-50 px-3 focus-within:border-brand-400 focus-within:ring-3 focus-within:ring-ring/30 lg:max-w-xl">
    <Search aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
    <Label className="grid gap-2 sr-only" htmlFor="admin-global-search">Cari di Admin</Label>
    <Input ref={input} className="min-w-0 flex-1 border-0 bg-transparent px-0 py-0 text-sm focus-visible:ring-0" id="admin-global-search" maxLength={80} minLength={2} name="q" placeholder="Cari order, referensi, customer, atau menu…" required type="search" />
    <kbd className="hidden shrink-0 rounded border border-border bg-card px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">Ctrl K</kbd>
  </form>;
}
