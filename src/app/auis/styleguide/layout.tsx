import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { Fraunces, Space_Grotesk } from "next/font/google";

import AuLogo from "@/components/ui/AuLogo";

import { navigation } from "./navigation";

type StyleguideLayoutProps = Readonly<{
  children: ReactNode;
}>;

const spaceGrotesk = Space_Grotesk({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-auis-proof-sans",
  weight: "variable",
});

const fraunces = Fraunces({
  axes: ["opsz"],
  display: "swap",
  subsets: ["latin"],
  variable: "--font-auis-proof-serif",
  weight: "variable",
});

const styleguideTypography = {
  "--font-body": "var(--font-auis-proof-sans)",
  "--font-body-token": "var(--font-auis-proof-sans)",
  "--font-display": "var(--font-auis-proof-sans)",
  "--font-display-token": "var(--font-auis-proof-sans)",
  "--font-mono": "var(--font-auis-proof-sans)",
  "--font-sans": "var(--font-auis-proof-sans)",
  "--font-technical": "var(--font-auis-proof-sans)",
  "--font-technical-token": "var(--font-auis-proof-sans)",
  fontFamily: "var(--font-auis-proof-sans), Arial, Helvetica, sans-serif",
} as CSSProperties;

const styleguideMotion = {
  "--motion-duration-deliberate": "320ms",
  "--motion-ease-spring-like": "cubic-bezier(0.22, 1, 0.36, 1)",
} as CSSProperties;

export default function StyleguideLayout({ children }: StyleguideLayoutProps) {
  return (
    <div
      className={`${spaceGrotesk.variable} ${fraunces.variable} min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]`}
      data-typography-scope="styleguide-only"
      style={{ ...styleguideTypography, ...styleguideMotion }}
    >
      <aside className="dark border-b border-border bg-sidebar text-sidebar-foreground lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-5 p-4 sm:p-5 lg:h-full lg:gap-8">
          <div className="space-y-3">
            <Link aria-label="Niuva foundation home" href="/auis/styleguide">
              <AuLogo className="h-auto w-44" priority />
            </Link>
            <p className="text-xs font-medium text-sidebar-foreground/60">
              AUiS foundation
            </p>
          </div>

          <nav aria-label="Foundation navigation" className="flex flex-wrap gap-x-6 gap-y-4 lg:block lg:space-y-6">
            {navigation.map((section) => (
              <div className="space-y-2" key={section.title}>
                <p className="text-xs font-semibold text-sidebar-foreground/60">
                  {section.title}
                </p>
                <ul className="flex flex-wrap gap-1 lg:block lg:space-y-1">
                  {section.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        className="block rounded-md px-2.5 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
                        href={item.href}
                      >
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <p className="mt-auto text-xs leading-5 text-sidebar-foreground/60">
            Typography System v1.0, Motion, dan Patterns disetujui untuk
            styleguide. Propagasi product screens tetap memiliki gate terpisah.
          </p>
        </div>
      </aside>

      <main className="min-w-0 px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="mx-auto max-w-public">{children}</div>
      </main>
    </div>
  );
}
