"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";

import AuLogo from "@/components/ui/AuLogo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type AdminModule = "action-queue" | "orders" | "custom-print" | "quotes" | "products" | "portfolio";

type AdminShellProps = Readonly<{
  accessLabel: string;
  activeModule: AdminModule | null;
  children: ReactNode;
  routeTarget: "/admin" | "/admin/sign-in";
}>;

const modules: readonly Readonly<{
  description: string;
  id: AdminModule;
  label: string;
}>[] = [
  {
    id: "action-queue",
    label: "Action Queue",
    description: "Tindakan operasional berikutnya",
  },
  {
    id: "orders",
    label: "Orders",
    description: "Status dan pemenuhan order",
  },
  {
    id: "custom-print",
    label: "Custom Print",
    description: "Review file dan quote",
  },
  {
    id: "quotes",
    label: "Quotes",
    description: "Draft dan snapshot quote",
  },
  {
    id: "products",
    label: "Products",
    description: "Katalog, varian, dan stok",
  },
  {
    id: "portfolio",
    label: "Portfolio",
    description: "Project proof dan publikasi",
  },
];

export function AdminShell({
  accessLabel,
  activeModule,
  children,
  routeTarget,
}: AdminShellProps) {
  const [navigationOpen, setNavigationOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  function closeNavigation() {
    setNavigationOpen(false);
    window.requestAnimationFrame(() => menuButtonRef.current?.focus());
  }

  useEffect(() => {
    if (!navigationOpen) return;

    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeNavigation();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [navigationOpen]);

  return (
    <div className="min-h-[100dvh] bg-neutral-50 text-foreground" data-admin-shell="preview">
      <a
        className="sr-only z-50 rounded-lg bg-background px-4 py-3 text-sm font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        href="#main-content"
      >
        Lewati ke konten utama
      </a>

      <header className="border-b border-border bg-background">
        <div className="mx-auto flex min-h-16 max-w-admin items-center gap-3 px-5 sm:px-8">
          <Link
            aria-label="Niuva, kembali ke halaman utama"
            className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            href="/"
          >
            <AuLogo className="h-6 w-auto sm:h-7" priority />
          </Link>
          <div className="hidden min-w-0 border-l border-border pl-3 min-[480px]:block">
            <p className="text-sm font-semibold text-foreground">Operasional</p>
            <p className="text-xs text-muted-foreground">Akses Owner dan Admin</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Badge className="hidden border-brand-200 bg-brand-50 text-brand-800 sm:inline-flex" variant="outline">
              Preview development
            </Badge>
            <Button
              aria-controls="admin-navigation"
              aria-expanded={navigationOpen}
              aria-label="Buka navigasi admin"
              className="min-h-11 lg:hidden"
              onClick={() => setNavigationOpen(true)}
              ref={menuButtonRef}
              type="button"
              variant="outline"
            >
              Menu
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-admin lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside
          aria-label="Modul administrasi"
          className={cn(
            "fixed inset-x-0 bottom-0 top-0 z-40 flex min-h-[100dvh] flex-col border-r border-border bg-background px-5 py-5 shadow-floating sm:left-0 sm:right-auto sm:w-80 sm:px-6 lg:sticky lg:top-0 lg:z-auto lg:flex lg:min-h-[calc(100dvh-4rem)] lg:w-auto lg:self-start lg:shadow-none",
            navigationOpen ? "flex" : "hidden",
          )}
          id="admin-navigation"
        >
          <div className="flex items-start justify-between gap-3 border-b border-border pb-5 lg:hidden">
            <div>
              <p className="text-sm font-semibold">Navigasi operasional</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">Kembali ke preview tanpa membuka route admin.</p>
            </div>
            <Button
              className="min-h-11 shrink-0"
              onClick={closeNavigation}
              ref={closeButtonRef}
              type="button"
              variant="outline"
            >
              Tutup navigasi admin
            </Button>
          </div>

          <div className="border-b border-border py-5 lg:pt-7">
            <p className="text-xs font-medium text-brand-700">Ruang kerja setelah akses diverifikasi</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Setiap modul tetap memerlukan sesi Clerk dan profil admin aktif di server.
            </p>
          </div>

          <nav aria-label="Modul administrasi" className="py-5">
            <ul className="space-y-1">
              {modules.map((module) => {
                const isActive = activeModule === module.id;

                return (
                  <li key={module.id}>
                    <div
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "rounded-lg border px-3 py-3",
                        isActive
                          ? "border-brand-300 bg-brand-50 text-brand-950"
                          : "border-transparent text-foreground",
                      )}
                    >
                      <p className="text-sm font-semibold">{module.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{module.description}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="mt-auto border-t border-border pt-5">
            <p className="text-xs text-muted-foreground">Target route</p>
            <p className="mt-1 font-mono text-xs font-medium text-foreground">{routeTarget}</p>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Navigasi ini hanya memperlihatkan struktur kerja. Route target tidak dibuka dari preview.
            </p>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="border-b border-border bg-neutral-100/70 px-5 py-3 sm:px-8">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">Status akses</p>
              <p className="text-xs font-medium text-foreground">{accessLabel}</p>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
