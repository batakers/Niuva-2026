import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import AuLogo from "@/components/ui/AuLogo";
import { AuLink } from "@/components/ui/AuLink";
import { publicCompanyProfile } from "@/features/public/company-content";
import { isLocalDemoMode } from "@/lib/env/server";
import { PublicNavigation } from "./public-navigation";

const typography = {
  "--font-auis-proof-sans": "var(--font-public-sans)", "--font-auis-proof-serif": "var(--font-public-editorial)",
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
  "project-brief": "server-backed",
  "quote-review": "frontend-preview",
  shop: "frontend-preview",
};

export function PublicShell({
  children,
  functionalStatus,
  scope,
}: {
  children: ReactNode;
  functionalStatus?: PublicScreenFunctionalStatus;
  scope: string;
}) {
  const resolvedFunctionalStatus = functionalStatus ?? defaultFunctionalStatusByScope[scope];
  const demoMode = isLocalDemoMode();
  const productRouteProofStatus = scope === "homepage" || scope === "project-brief"
    ? "approved-owner"
    : "pending-owner-review";

  return (
    <div className="min-h-screen bg-background text-foreground"
      style={typography} data-foundation-propagation="approved" data-foundation-scope={scope}
      data-product-screen-proof-status={productRouteProofStatus} data-typography-propagation="approved" data-typography-version="1.0"
      data-runtime-mode={demoMode ? "demo" : "standard"}
      data-homepage={scope === "homepage" ? "" : undefined}
      data-project-brief={scope === "project-brief" ? "" : undefined}
      data-product-screen-functional={resolvedFunctionalStatus}>
      <a href="#main-content" className="sr-only z-50 rounded-lg bg-background px-4 py-3 text-sm font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        Lewati ke konten utama
      </a>
      <header className="dark border-b border-border bg-background text-foreground" data-home-section="header">
        <div className="mx-auto flex max-w-public flex-wrap items-center gap-3 px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Niuva, kembali ke halaman utama" className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <AuLogo className="h-7 w-auto sm:h-8" priority />
          </Link>
          <PublicNavigation />
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
          <AuLink href="/project-brief" size="sm" className="min-h-11 hidden md:inline-flex">Diskusikan Proyek</AuLink>
        </div>
      </header>
      {children}
      <footer className="dark border-t border-border bg-background text-foreground" data-home-section="footer">
        <div className="mx-auto grid max-w-public gap-8 px-5 py-10 sm:px-8 md:grid-cols-[minmax(0,1fr)_minmax(15rem,0.7fr)]">
          <div className="space-y-4">
            <Link href="/" aria-label="Niuva, kembali ke halaman utama" className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><AuLogo className="h-7 w-auto" /></Link>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">{publicCompanyProfile.supportingCopy}</p>
            <p className="text-xs text-muted-foreground">Niuva Inovasi Utama</p>
          </div>
          <div className="space-y-6 md:justify-self-end">
            <address className="max-w-sm text-sm not-italic leading-6 text-muted-foreground">
              <p>{publicCompanyProfile.contact.location}</p>
              <a className="mt-3 block underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`mailto:${publicCompanyProfile.contact.email}`}>
                {publicCompanyProfile.contact.email}
              </a>
              <a className="mt-1 block underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={publicCompanyProfile.contact.phoneHref}>
                {publicCompanyProfile.contact.phone}
              </a>
            </address>
            <nav aria-label="Navigasi footer" className="flex flex-wrap items-start gap-x-6 gap-y-2">
              {[["/shop", "Shop"], ["/cart", "Cart"], ["/custom-print", "Custom Print"], ["/services", "Layanan"], ["/projects", "Projects"], ["/project-brief", "Diskusikan Proyek"]].map(([href, label]) => (
                <Link key={href} href={href} className="inline-flex min-h-11 items-center rounded-lg text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{label}</Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
