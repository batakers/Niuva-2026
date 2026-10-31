"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Icon } from "@/components/ui/Icon";
import { useCartCount } from "@/features/cart/use-cart-count";
import { useHydrated } from "./use-hydrated";

const primaryLinks = [
  { href: "/services", label: "Layanan" },
  { href: "/projects", label: "Proyek" },
  { href: "/custom-print", label: "Custom 3D Print" },
  { href: "/shop", label: "Toko" },
] as const;

const utilityLinks = [
  { href: "/cart", label: "Keranjang" },
  { href: "/account", label: "Akun" },
] as const;

function isActiveRoute(pathname: string | null, href: string) {
  return pathname === href || pathname?.startsWith(`${href}/`) === true;
}

const navigationLinkClassName =
  "relative inline-flex min-h-11 items-center rounded-full px-3 text-ui font-medium text-foreground/80 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 after:content-[''] after:pointer-events-none after:absolute after:inset-x-3 after:bottom-1.5 after:h-0.5 after:rounded-full after:bg-brand-600 after:opacity-0 aria-[current=page]:text-foreground aria-[current=page]:after:opacity-100";

export type PublicHeaderAction = Readonly<{ href: string; label: string }> | null;

export function PublicNavigation({ action, showB2BContact = false }: { action: PublicHeaderAction; showB2BContact?: boolean }) {
  const hydrated = useHydrated();
  const cartCount = useCartCount();
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
      <Button ref={toggle} type="button" variant="outline" size="sm" disabled={!hydrated} className={`${showB2BContact ? "max-xl:order-2" : "ml-auto"} xl:hidden`}
        aria-expanded={open} aria-controls="public-navigation" aria-label={open ? "Tutup menu" : "Buka menu"}
        onClick={() => setOpen(!open)}>
        {open ? <Icon aria-hidden="true" name="x" /> : <Icon aria-hidden="true" name="menu" />}
        <span className="max-sm:sr-only">Menu</span>
      </Button>
      <nav id="public-navigation" aria-label="Navigasi utama"
        className={`${open ? "flex" : "hidden"} order-last w-full flex-col gap-1 border-t border-border pt-3 pb-2 xl:order-none xl:ml-8 xl:flex xl:w-auto xl:flex-1 xl:flex-row xl:items-center xl:gap-1 xl:border-0 xl:p-0`}>
        <div className="flex flex-col gap-1 xl:flex-row xl:items-center xl:gap-2" data-navigation-group="primary">
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
        <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2 xl:mt-0 xl:ml-auto xl:flex-row xl:items-center xl:gap-1 xl:border-0 xl:pt-0" data-navigation-group="utility">
          {utilityLinks.map(({ href, label }) => {
            const current = isActiveRoute(pathname, href);
            return (
              <Link key={href} href={href} aria-current={current ? "page" : undefined}
                className={navigationLinkClassName}
                onClick={() => setOpen(false)}>
                {label}
                {href === "/cart" && cartCount ? (
                  <>
                    <span aria-hidden="true" data-cart-count className="ml-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-700 px-1.5 text-xs font-semibold tabular-nums text-white">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                    <span className="sr-only">, {cartCount} item di keranjang</span>
                  </>
                ) : null}
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
