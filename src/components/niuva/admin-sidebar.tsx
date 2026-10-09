"use client";

import { createContext, useContext, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

const SidebarContext = createContext({ collapsed: false, toggle: () => {} });

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
    <SidebarContext.Provider value={{ collapsed, toggle }}>
      <TooltipProvider delay={150}>
        <div
          className="group/admin-shell grid min-h-dvh w-full lg:grid-cols-[13.25rem_minmax(0,1fr)] data-[sidebar-collapsed=true]:lg:grid-cols-[4rem_minmax(0,1fr)]"
          data-sidebar-collapsed={collapsed}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

export function AdminSidebarToggle() {
  const { collapsed, toggle } = useContext(SidebarContext);
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
        onClick={toggle}
        render={<button type="button" />}
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
  const { collapsed } = useContext(SidebarContext);

  return (
    <Tooltip disabled={!collapsed}>
      <TooltipTrigger
        render={<Link href={href} aria-current={active ? "page" : undefined} />}
        className={`inline-flex min-h-11 min-w-0 items-center rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${collapsed ? "justify-center px-0" : "gap-3 px-3"} ${active ? "border-brand-300 bg-brand-50 text-brand-900" : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"}`}
      >
        {children}
        <span className={collapsed ? "sr-only" : undefined}>{label}</span>
      </TooltipTrigger>
      <TooltipContent role="tooltip" side="right" sideOffset={12}>{label}</TooltipContent>
    </Tooltip>
  );
}
