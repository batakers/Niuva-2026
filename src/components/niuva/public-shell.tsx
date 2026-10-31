import type { ReactNode } from "react";
import Link from "next/link";
import NiuvaLogo from "@/components/ui/NiuvaLogo";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { PublicSiteContact, PublicSiteDescription } from "./public-site-information";
import { isLocalDemoMode } from "@/lib/env/server";
import { PublicNavigation, type PublicHeaderAction } from "./public-navigation";
import { B2BContactLink } from "./b2b-contact-link";
import { isPolicyPublished } from "@/modules/customer-auth/public-policy";

export type PublicScreenFunctionalStatus =
  | "capability-gated"
  | "frontend-preview"
  | "server-backed";

const defaultFunctionalStatusByScope: Readonly<Record<string, PublicScreenFunctionalStatus | undefined>> = {
  cart: "frontend-preview",
  checkout: "frontend-preview",
  "custom-request": "frontend-preview",
  "custom-print": "frontend-preview",
  "order-status": "frontend-preview",
  "product-detail": "frontend-preview",
  "quote-review": "frontend-preview",
  shop: "frontend-preview",
};

const b2bHeaderScopes = new Set(["homepage", "services", "projects", "project-detail", "system-not-found"]);

export function PublicShell({
  children,
  functionalStatus,
  headerAction,
  contactService,
  scope,
}: {
  children: ReactNode;
  functionalStatus?: PublicScreenFunctionalStatus;
  headerAction?: PublicHeaderAction;
  contactService?: string;
  scope: string;
}) {
  const resolvedFunctionalStatus = functionalStatus ?? defaultFunctionalStatusByScope[scope];
  const resolvedHeaderAction = headerAction ?? null;
  const showB2BContact = headerAction === undefined && b2bHeaderScopes.has(scope);
  const demoMode = isLocalDemoMode();
  // Owner accepted the homepage visually on 31 Oct 2026; every other public route still awaits review.
  const productRouteProofStatus = scope === "homepage" ? "approved-owner" : "pending-owner-review";

  // --panel-inset puts text inside edge-to-edge panels on the header's content gutter (DESIGN.md Layout).
  return (
    <div className="@container min-h-screen bg-background text-foreground [--panel-inset:max(1.5rem,calc((100cqw_-_81rem)/2_+_1.5rem))]"
      data-foundation-propagation="approved" data-foundation-scope={scope}
      data-product-screen-proof-status={productRouteProofStatus} data-typography-propagation="approved" data-typography-version="2.0"
      data-runtime-mode={demoMode ? "demo" : "standard"}
      data-homepage={scope === "homepage" ? "" : undefined}
      data-product-screen-functional={resolvedFunctionalStatus}>
      <a href="#main-content" className="sr-only z-50 rounded-lg bg-background px-4 py-3 text-sm font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        Lewati ke konten utama
      </a>
      <header className="sticky top-0 z-40 bg-background/88 text-foreground backdrop-blur-md supports-[backdrop-filter]:bg-background/80" data-home-section="header">
        <div className="mx-auto flex min-h-18 max-w-public flex-wrap items-center gap-2 px-5 py-3 sm:gap-3 sm:px-12">
          <Link href="/" aria-label="Niuva, kembali ke halaman utama" className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <NiuvaLogo className="h-6 w-auto sm:h-7" preload />
          </Link>
          <PublicNavigation action={resolvedHeaderAction} showB2BContact={showB2BContact} />
          {demoMode ? (
            <span
              aria-label="Mode demo lokal aktif"
              className="rounded-md border border-warning-border bg-warning-background px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-warning"
              data-demo-badge
              title="Data dan provider deterministik lokal; bukan mode produksi"
            >
              Demo lokal
            </span>
          ) : null}
          {resolvedHeaderAction ? <NiuvaLink href={resolvedHeaderAction.href} size="sm" variant="outline" className="hidden xl:inline-flex">{resolvedHeaderAction.label}</NiuvaLink> : null}
          {showB2BContact ? <B2BContactLink className="max-xl:order-1 max-xl:ml-auto" service={contactService} size="sm" /> : null}
        </div>
      </header>
      {children}
      <footer className="mt-24 border-t border-border bg-background text-foreground sm:mt-32" data-home-section="footer">
        {/* Tablet gives the brand its own row; four columns only fit from lg. */}
        <div className="mx-auto grid max-w-public gap-10 px-5 pt-12 pb-16 sm:px-12 md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_minmax(0,0.8fr)] lg:grid-cols-[minmax(0,1.4fr)_minmax(9rem,0.8fr)_minmax(13rem,1.2fr)_minmax(9rem,0.8fr)]">
          <div className="space-y-4 md:col-span-3 lg:col-span-1">
            <Link href="/" aria-label="Niuva, kembali ke halaman utama" className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><NiuvaLogo className="h-7 w-auto" /></Link>
            <p className="max-w-sm text-ui leading-6 text-muted-foreground"><PublicSiteDescription /></p>
            <p className="text-sm text-muted-foreground">Niuva Inovasi Utama</p>
          </div>
          <nav aria-label="Navigasi footer">
            <p className="text-sm font-semibold text-foreground">Jelajahi</p>
            <div className="mt-2 flex flex-col items-start">
              {[["/services", "Layanan"], ["/projects", "Proyek"], ["/custom-print", "Custom 3D Print"], ["/shop", "Toko"]].map(([href, label]) => (
                <Link key={href} href={href} className="inline-flex min-h-11 items-center rounded-lg text-ui text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{label}</Link>
              ))}
            </div>
          </nav>
          <div>
            <p className="text-sm font-semibold text-foreground">Bantuan</p>
            <div className="mt-2 flex flex-col items-start">
              <B2BContactLink variant="link" className="min-h-11 justify-start px-0 font-normal text-muted-foreground" />
              <address className="mt-2 max-w-sm text-ui not-italic leading-6 text-muted-foreground">
                <PublicSiteContact />
              </address>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Akun dan legal</p>
            <nav aria-label="Akun dan belanja" className="mt-2 flex flex-col items-start">
              {[["/cart", "Keranjang"], ["/account", "Akun"]].map(([href, label]) => (
                <Link key={href} href={href} className="inline-flex min-h-11 items-center rounded-lg text-ui text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{label}</Link>
              ))}
            </nav>
            {isPolicyPublished() ? <nav aria-label="Dokumen legal" className="flex flex-col items-start">
              {[["/terms", "Syarat Layanan"], ["/privacy", "Kebijakan Privasi"]].map(([href, label]) => (
                <Link key={href} href={href} className="inline-flex min-h-11 items-center rounded-lg text-ui text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{label}</Link>
              ))}
            </nav> : null}
          </div>
        </div>
      </footer>
    </div>
  );
}
