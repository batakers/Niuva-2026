"use client";

import { useCallback, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarMenuButton, SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useHydrated } from "./use-hydrated";
import { useAdminPointerPress } from "./admin-interaction-motion";
import motion from "./admin-interaction-motion.module.css";

const preferenceKey = "niuva.admin.sidebar.v1";
const preferenceEvent = "niuva:admin-sidebar-change";
let fallbackCollapsed = false;
let memoryOverride: boolean | undefined;

function readPreference() {
  if (memoryOverride !== undefined) return memoryOverride;
  try {
    fallbackCollapsed = window.localStorage.getItem(preferenceKey) === "collapsed";
    return fallbackCollapsed;
  } catch {
    return fallbackCollapsed;
  }
}

function subscribe(onChange: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === preferenceKey || event.key === null) {
      memoryOverride = undefined;
      onChange();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(preferenceEvent, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(preferenceEvent, onChange);
  };
}

export function AdminSidebarLayout({ children }: Readonly<{ children: ReactNode }>) {
  const collapsed = useSyncExternalStore(subscribe, readPreference, () => false);

  function toggle() {
    fallbackCollapsed = !collapsed;
    try {
      window.localStorage.setItem(preferenceKey, fallbackCollapsed ? "collapsed" : "expanded");
      memoryOverride = undefined;
    } catch {
      // Navigation remains usable when the browser refuses persistent storage.
      memoryOverride = fallbackCollapsed;
    }
    window.dispatchEvent(new Event(preferenceEvent));
  }

  return (
    <TooltipProvider delay={150}>
      <SidebarProvider open={!collapsed} onOpenChange={toggle}>{children}</SidebarProvider>
    </TooltipProvider>
  );
}

export function AdminSidebarToggle() {
  const { open, toggleSidebar } = useSidebar();
  const collapsed = !open;
  const press = useAdminPointerPress();
  const label = collapsed ? "Perluas navigasi Admin" : "Lipat navigasi Admin";
  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <Tooltip>
      <TooltipTrigger
        {...press}
        aria-controls="admin-desktop-sidebar"
        aria-expanded={!collapsed}
        aria-label={label}
        className={`${motion.press} inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50`}
        onClick={toggleSidebar}
        render={<Button variant="outline" size="icon" type="button" />}
      >
        <Icon aria-hidden="true" className="size-4 shrink-0" />
      </TooltipTrigger>
      <TooltipContent role="tooltip" side="right" sideOffset={12}>{label}</TooltipContent>
    </Tooltip>
  );
}

export function AdminSidebarLink({
  active = false,
  children,
  href,
  label,
}: Readonly<{ active?: boolean; children: ReactNode; href: string; label: string }>) {
  const { open } = useSidebar();
  const collapsed = !open;

  return (
    <Tooltip disabled={!collapsed}>
      <TooltipTrigger
        render={<SidebarMenuButton isActive={active} render={<Link href={href} aria-current={active ? "page" : undefined} />} />}
      >
        {children}
        <span className={collapsed ? "sr-only" : undefined}>{label}</span>
      </TooltipTrigger>
      <TooltipContent role="tooltip" side="right" sideOffset={12}>{label}</TooltipContent>
    </Tooltip>
  );
}

export function AdminMobileNavigation({ children }: Readonly<{ children: ReactNode }>) {
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const disclosure = useRef<HTMLDetailsElement | null>(null);
  const preserveDisclosure = useCallback((node: HTMLDetailsElement | null) => {
    if (!node && disclosure.current?.open) setOpen(true);
    disclosure.current = node;
  }, []);

  // The native disclosure keeps every route available without JavaScript.
  if (!hydrated) return <details ref={preserveDisclosure} onToggle={event => setOpen(event.currentTarget.open)} className="mt-3 lg:hidden">
    <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-medium focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><Menu aria-hidden className="size-4" />Menu Admin</summary>
    <div className="mt-3 space-y-4 border-t border-border pt-4">{children}</div>
  </details>;

  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger render={<Button variant="outline" className="lg:hidden" />} aria-label="Menu Admin"><Menu aria-hidden className="size-4" /><span>Menu Admin</span></SheetTrigger>
    <SheetContent side="left" className="w-80 max-w-[calc(100vw-2rem)] overflow-y-auto" onClick={event => {
      if (event.target instanceof Element && event.target.closest("a")) setOpen(false);
    }}>
      <SheetHeader className="border-b border-border pb-4 pr-12">
        <SheetTitle>Navigasi Admin</SheetTitle>
        <SheetDescription>Pilih area kerja Niuva.</SheetDescription>
      </SheetHeader>
      <div className="space-y-4 px-3 pb-6">{children}</div>
    </SheetContent>
  </Sheet>;
}
