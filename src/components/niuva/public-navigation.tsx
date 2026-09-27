"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Icon } from "@/components/ui/Icon";
import { useHydrated } from "./use-hydrated";

const primaryLinks = [
  { href: "/services", label: "Layanan" },
  { href: "/projects", label: "Projects" },
  { href: "/custom-print", label: "Custom Print" },
  { href: "/shop", label: "Shop" },
] as const;

const utilityLinks = [
  { href: "/cart", label: "Cart" },
  { href: "/account", label: "Akun" },
] as const;

function isActiveRoute(pathname: string | null, href: string) {
  return pathname === href || pathname?.startsWith(`${href}/`) === true;
}

const navigationLinkClassName =
  "relative inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 after:content-[''] after:pointer-events-none after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-500 after:opacity-0 aria-[current=page]:text-foreground aria-[current=page]:after:opacity-100";

export type PublicHeaderAction = Readonly<{ href: string; label: string }> | null;

export function PublicNavigation({ action }: { action: PublicHeaderAction }) {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  return (
    <div className="contents" onKeyDown={(event) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        toggle.current?.focus();
      }
    }}>
      <Button ref={toggle} type="button" variant="outline" disabled={!hydrated} className="ml-auto min-h-11 xl:hidden"
        aria-expanded={open} aria-controls="public-navigation" aria-label={open ? "Tutup menu" : "Buka menu"}
        onClick={() => setOpen(!open)}>
        {open ? <Icon aria-hidden="true" name="x" /> : <Icon aria-hidden="true" name="menu" />}
        Menu
      </Button>
      <nav id="public-navigation" aria-label="Navigasi utama"
        className={`${open ? "flex" : "hidden"} order-last w-full flex-col gap-1 border-t border-border pt-3 xl:order-none xl:ml-auto xl:flex xl:w-auto xl:flex-row xl:items-center xl:gap-1 xl:border-0 xl:pt-0`}>
        <div className="flex flex-col gap-1 xl:flex-row xl:items-center xl:gap-1" data-navigation-group="primary">
          {primaryLinks.map(({ href, label }) => {
            const current = isActiveRoute(pathname, href);
            return (
              <Link key={href} href={href} aria-current={current ? "page" : undefined}
                className={navigationLinkClassName}
                onClick={() => setOpen(false)}>
                {label}
              </Link>
            );
          })}
        </div>
        <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2 xl:mt-0 xl:flex-row xl:items-center xl:gap-1 xl:border-l xl:border-t-0 xl:pl-2 xl:pt-0" data-navigation-group="utility">
          {utilityLinks.map(({ href, label }) => {
            const current = isActiveRoute(pathname, href);
            return (
              <Link key={href} href={href} aria-current={current ? "page" : undefined}
                className={navigationLinkClassName}
                onClick={() => setOpen(false)}>
                {label}
              </Link>
            );
          })}
        </div>
        {action ? <NiuvaLink href={action.href} size="sm" className="mt-2 w-full justify-center xl:hidden" onClick={() => setOpen(false)}>
          {action.label}
        </NiuvaLink> : null}
      </nav>
    </div>
  );
}
