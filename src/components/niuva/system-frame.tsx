import type { ReactNode } from "react";
import Link from "next/link";
import NiuvaLogo from "@/components/ui/NiuvaLogo";
import { SkipLink } from "./skip-link";

/**
 * Standalone public frame for `error.tsx` (design Keputusan A, R3.11).
 * PublicShell is a server tree that reads server env, so it must not be imported
 * into a client error boundary. This frame has no navigation, footer or demo badge.
 */
export function SystemFrame({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div
      className="min-h-screen bg-background text-foreground"
      data-foundation-scope="system"
      data-product-screen-proof-status="pending-owner-review"
    >
      <SkipLink />
      <header className="dark border-b border-border bg-background text-foreground">
        <div className="mx-auto flex max-w-public items-center px-5 py-2.5 sm:px-8">
          <Link
            href="/"
            aria-label="Niuva, kembali ke halaman utama"
            className="inline-flex min-h-11 shrink-0 items-center rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <NiuvaLogo className="h-7 w-auto sm:h-8" priority />
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
