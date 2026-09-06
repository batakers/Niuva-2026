"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useHydrated } from "./use-hydrated";

const links = [
  { href: "/shop", label: "Shop" },
  { href: "/services", label: "Layanan" },
  { href: "/projects", label: "Projects" },
  { href: "/#process", label: "Cara kerja" },
  { href: "/#entry-paths", label: "Pilih jalur" },
  { href: "/project-brief", label: "Diskusikan Proyek" },
] as const;

export function PublicNavigation() {
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
      <Button ref={toggle} type="button" variant="outline" disabled={!hydrated} className="ml-auto min-h-11 md:hidden"
        aria-expanded={open} aria-controls="public-navigation" aria-label={open ? "Tutup menu" : "Buka menu"}
        onClick={() => setOpen(!open)}>
        {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        Menu
      </Button>
      <nav id="public-navigation" aria-label="Navigasi utama"
        className={`${open ? "flex" : "hidden"} order-last w-full flex-col gap-1 border-t border-border pt-3 md:order-none md:ml-auto md:flex md:w-auto md:flex-row md:items-center md:gap-1 md:border-0 md:pt-0`}>
        {links.map(({ href, label }) => (
          <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:text-foreground ${href === "/project-brief" ? "md:hidden" : ""}`}
            onClick={() => setOpen(false)}>
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
