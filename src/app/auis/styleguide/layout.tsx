import type { ReactNode } from "react";
import Link from "next/link";

import AuLogo from "@/components/ui/AuLogo";

import { navigation } from "./navigation";

type StyleguideLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function StyleguideLayout({ children }: StyleguideLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="border-b border-border bg-sidebar lg:sticky lg:top-0 lg:h-screen lg:border-r lg:border-b-0">
        <div className="flex flex-col gap-5 p-4 sm:p-5 lg:h-full lg:gap-8">
          <div className="space-y-3">
            <Link aria-label="Niuva foundation home" href="/auis/styleguide">
              <AuLogo className="h-auto w-44" priority />
            </Link>
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-sidebar-foreground/60">
              AUiS foundation
            </p>
          </div>

          <nav aria-label="Foundation navigation" className="flex flex-wrap gap-x-6 gap-y-4 lg:block lg:space-y-6">
            {navigation.map((section) => (
              <div className="space-y-2" key={section.title}>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sidebar-foreground/60">
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
            UI Foundation approved. Design System contract is the gate before
            screen propagation.
          </p>
        </div>
      </aside>

      <main className="min-w-0 px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <div className="mx-auto max-w-public">{children}</div>
      </main>
    </div>
  );
}
