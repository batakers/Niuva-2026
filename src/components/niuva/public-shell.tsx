import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import NiuvaLogo from "@/components/ui/NiuvaLogo";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { PublicSiteContact, PublicSiteDescription } from "./public-site-information";
import { isLocalDemoMode } from "@/lib/env/server";
import { PublicNavigation, type PublicHeaderAction } from "./public-navigation";
import { B2BContactLink } from "./b2b-contact-link";

const typography = {
  "--font-body": "var(--font-public-sans)", "--font-body-token": "var(--font-public-sans)",
  "--font-display": "var(--font-public-sans)", "--font-display-token": "var(--font-public-sans)",
  "--font-mono": "var(--font-public-sans)", "--font-sans": "var(--font-public-sans)",
  "--font-technical": "var(--font-public-sans)", "--font-technical-token": "var(--font-public-sans)",
  fontFamily: "var(--font-public-sans), Arial, Helvetica, sans-serif",
} as CSSProperties;

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

const b2bHeaderScopes = new Set(["homepage", "services", "projects", "project-detail"]);

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
  const productRouteProofStatus = "pending-owner-review";

  return (
    <div className="min-h-screen bg-background text-foreground"
      style={typography} data-foundation-propagation="approved" data-foundation-scope={scope}
      data-product-screen-proof-status={productRouteProofStatus} data-typography-propagation="approved" data-typography-version="1.0"
      data-runtime-mode={demoMode ? "demo" : "standard"}
      data-homepage={scope === "homepage" ? "" : undefined}
      data-product-screen-functional={resolvedFunctionalStatus}>
      <a href="#main-content" className="sr-only z-50 rounded-lg bg-background px-4 py-3 text-sm font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        Lewati ke konten utama
      </a>
      <header className="dark border-b border-border bg-background text-foreground" data-home-section="header">
        <div className="mx-auto flex max-w-public flex-wrap items-center gap-3 px-5 py-2.5 sm:px-8">
          <Link href="/" aria-label="Niuva, kembali ke halaman utama" className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <NiuvaLogo className="h-7 w-auto sm:h-8" priority />
          </Link>
          <PublicNavigation action={resolvedHeaderAction} showB2BContact={showB2BContact} contactService={contactService} />
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
          {resolvedHeaderAction ? <NiuvaLink href={resolvedHeaderAction.href} size="sm" className="min-h-11 hidden xl:inline-flex">{resolvedHeaderAction.label}</NiuvaLink> : null}
          {showB2BContact ? <B2BContactLink className="hidden xl:inline-flex" service={contactService} size="sm" /> : null}
        </div>
      </header>
      {children}
      <footer className="dark border-t border-border bg-background text-foreground" data-home-section="footer">
        <div className="mx-auto grid max-w-public gap-8 px-5 py-10 sm:px-8 md:grid-cols-[minmax(0,1.2fr)_minmax(10rem,0.6fr)_minmax(13rem,0.8fr)]">
          <div className="space-y-4">
            <Link href="/" aria-label="Niuva, kembali ke halaman utama" className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><NiuvaLogo className="h-7 w-auto" /></Link>
            <p className="max-w-md text-sm leading-6 text-muted-foreground"><PublicSiteDescription /></p>
            <p className="text-xs text-muted-foreground">Niuva Inovasi Utama</p>
          </div>
          <nav aria-label="Navigasi footer">
            <p className="text-sm font-semibold text-foreground">Jelajahi</p>
            <div className="mt-3 flex flex-col items-start">
              {[["/services", "Layanan"], ["/projects", "Projects"], ["/custom-print", "Custom Print"], ["/shop", "Shop"]].map(([href, label]) => (
                <Link key={href} href={href} className="inline-flex min-h-11 items-center rounded-lg text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{label}</Link>
              ))}
              <B2BContactLink variant="link" className="justify-start px-0 text-muted-foreground" />
            </div>
          </nav>
          <div className="space-y-5">
            <nav aria-label="Akun dan belanja" className="flex flex-wrap gap-x-5 gap-y-1">
              {[["/cart", "Cart"], ["/account", "Akun"]].map(([href, label]) => (
                <Link key={href} href={href} className="inline-flex min-h-11 items-center rounded-lg text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{label}</Link>
              ))}
            </nav>
            <address className="max-w-sm text-sm not-italic leading-6 text-muted-foreground">
              <PublicSiteContact />
            </address>
          </div>
        </div>
      </footer>
    </div>
  );
}
