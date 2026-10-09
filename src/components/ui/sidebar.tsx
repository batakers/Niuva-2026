"use client";

import * as React from "react";
import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cn } from "@/lib/utils";

// The shadcn/ui base-nova Sidebar composition, narrowed to Niuva's navigation.
// Persistence belongs to the Admin adapter; this shared primitive sets no cookies.
type SidebarContextValue = {
  open: boolean;
  state: "expanded" | "collapsed";
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) throw new Error("useSidebar must be used within a SidebarProvider.");
  return context;
}

function SidebarProvider({
  open,
  onOpenChange,
  className,
  style,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const value = React.useMemo<SidebarContextValue>(() => ({
    open,
    state: open ? "expanded" : "collapsed",
    toggleSidebar: () => onOpenChange(!open),
  }), [open, onOpenChange]);

  return <SidebarContext.Provider value={value}>
    <div
      data-slot="sidebar-wrapper"
      data-sidebar-collapsed={!open}
      className={cn("group/admin-shell flex min-h-dvh w-full", className)}
      style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "4rem", ...style } as React.CSSProperties}
      {...props}
    >{children}</div>
  </SidebarContext.Provider>;
}

function Sidebar({ className, children, ...props }: React.ComponentProps<"aside">) {
  const { state } = useSidebar();
  return <aside
    data-slot="sidebar"
    data-state={state}
    data-collapsible={state === "collapsed" ? "icon" : ""}
    className={cn("group/sidebar sticky top-0 hidden h-dvh w-(--sidebar-width) shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground data-[collapsible=icon]:w-(--sidebar-width-icon) lg:flex", className)}
    {...props}
  >{children}</aside>;
}

function SidebarInset({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-inset" className={cn("relative flex min-w-0 flex-1 flex-col bg-background", className)} {...props} />;
}

function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-header" className={cn("flex shrink-0 flex-col gap-2 p-4 group-data-[collapsible=icon]/sidebar:p-2", className)} {...props} />;
}

function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-footer" className={cn("flex shrink-0 flex-col gap-2 border-t border-sidebar-border p-3", className)} {...props} />;
}

function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-content" className={cn("flex min-h-0 flex-1 flex-col gap-2 overflow-auto px-2 pb-4 group-data-[collapsible=icon]/sidebar:[scrollbar-width:none]", className)} {...props} />;
}

function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group" className={cn("relative flex w-full min-w-0 flex-col p-2 group-data-[collapsible=icon]/sidebar:px-0", className)} {...props} />;
}

function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group-label" className={cn("mb-2 flex min-h-6 items-center px-3 text-xs font-medium text-muted-foreground group-data-[collapsible=icon]/sidebar:sr-only", className)} {...props} />;
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="sidebar-group-content" className={cn("w-full text-sm", className)} {...props} />;
}

function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul data-slot="sidebar-menu" className={cn("flex w-full min-w-0 flex-col gap-1", className)} {...props} />;
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li data-slot="sidebar-menu-item" className={cn("group/menu-item relative", className)} {...props} />;
}

function SidebarMenuButton({
  isActive = false,
  className,
  render,
  ...props
}: useRender.ComponentProps<"button"> & { isActive?: boolean }) {
  return useRender({
    defaultTagName: "button",
    render,
    state: { slot: "sidebar-menu-button", active: isActive },
    props: mergeProps<"button">({
      className: cn("peer/menu-button flex min-h-11 w-full min-w-0 items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left text-sm font-medium text-muted-foreground outline-none transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 data-active:border-brand-300 data-active:bg-brand-50 data-active:text-brand-900 group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:px-0 [&>svg]:size-4 [&>svg]:shrink-0", className),
    }, props),
  });
}

export {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, useSidebar,
};
