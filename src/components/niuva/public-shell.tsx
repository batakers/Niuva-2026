import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Fraunces, Space_Grotesk } from "next/font/google";
import AuLogo from "@/components/ui/AuLogo";
import { AuLink } from "@/components/ui/AuLink";
import { PublicNavigation } from "./public-navigation";

const sans = Space_Grotesk({ display: "swap", subsets: ["latin"], variable: "--font-public-sans", weight: "variable" });
const editorial = Fraunces({ axes: ["opsz"], display: "swap", subsets: ["latin"], variable: "--font-public-editorial", weight: "variable" });
const typography = {
  "--font-auis-proof-sans": "var(--font-public-sans)", "--font-auis-proof-serif": "var(--font-public-editorial)",
  "--font-body": "var(--font-public-sans)", "--font-body-token": "var(--font-public-sans)",
  "--font-display": "var(--font-public-sans)", "--font-display-token": "var(--font-public-sans)",
  "--font-mono": "var(--font-public-sans)", "--font-sans": "var(--font-public-sans)",
  "--font-technical": "var(--font-public-sans)", "--font-technical-token": "var(--font-public-sans)",
  fontFamily: "var(--font-public-sans), Arial, Helvetica, sans-serif",
} as CSSProperties;

export function PublicShell({ children, scope }: { children: ReactNode; scope: string }) {
  return (
    <div className={`${sans.variable} ${editorial.variable} min-h-screen bg-background text-foreground`}
      style={typography} data-foundation-propagation="approved" data-foundation-scope={scope}
      data-product-screen-proof-status="pending-owner-review" data-typography-version="1.0"
      data-homepage={scope === "homepage" ? "" : undefined}
      data-project-brief={scope === "project-brief" ? "" : undefined}
      data-product-screen-functional={["cart", "checkout", "custom-print", "custom-request", "order-status", "product-detail", "project-brief", "quote-review", "shop"].includes(scope) ? "frontend-preview" : undefined}>
      <a href="#main-content" className="sr-only z-50 rounded-lg bg-background px-4 py-3 text-sm font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        Lewati ke konten utama
      </a>
      <header className="dark border-b border-border bg-background text-foreground" data-home-section="header">
        <div className="mx-auto flex max-w-public flex-wrap items-center gap-3 px-5 py-4 sm:px-8">
          <Link href="/" aria-label="Niuva, kembali ke halaman utama" className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <AuLogo className="h-7 w-auto sm:h-8" priority />
          </Link>
          <PublicNavigation />
          <AuLink href="/project-brief" size="sm" className="min-h-11 hidden md:inline-flex">Diskusikan Proyek</AuLink>
        </div>
      </header>
      {children}
      <footer className="dark border-t border-border bg-background text-foreground" data-home-section="footer">
        <div className="mx-auto grid max-w-public gap-8 px-5 py-10 sm:px-8 md:grid-cols-2">
          <div className="space-y-4">
            <Link href="/" aria-label="Niuva, kembali ke halaman utama" className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"><AuLogo className="h-7 w-auto" /></Link>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">Dari ide menjadi produk nyata melalui riset, desain, prototyping, dan dukungan manufaktur.</p>
            <p className="text-xs text-muted-foreground">Niuva Inovasi Utama</p>
          </div>
          <nav aria-label="Navigasi footer" className="flex flex-wrap items-start gap-x-6 gap-y-2 md:justify-end">
            {[["/shop", "Shop"], ["/custom-print", "Custom Print"], ["/services", "Layanan"], ["/projects", "Projects"], ["/project-brief", "Diskusikan Proyek"]].map(([href, label]) => (
              <Link key={href} href={href} className="inline-flex min-h-11 items-center rounded-lg text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{label}</Link>
            ))}
          </nav>
        </div>
      </footer>
    </div>
  );
}
