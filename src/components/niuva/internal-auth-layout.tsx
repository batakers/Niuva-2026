import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { typographySystemTokens } from "@/design/typography";
export function InternalAuthLayout({ title, children }: { title: string; children: ReactNode }) {
  return <div className="flex min-h-svh flex-col bg-background text-foreground">
    <a href="#main-content" className="sr-only rounded-lg bg-background p-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:ring-3 focus-visible:ring-ring">Lewati ke konten utama</a>
    <header className="px-5 py-4 sm:px-8 sm:py-6"><Link className="inline-flex min-h-11 items-center rounded-lg focus-visible:ring-3 focus-visible:ring-ring" href="/" aria-label="Niuva, kembali ke halaman utama"><Image src="/assets/brand/niuva-logo-horizontal-light.svg" alt="" width={1831} height={346} className="h-6 w-auto" /></Link></header>
    <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-reading flex-1 px-5 py-8 outline-none sm:px-8 sm:py-12">
      <p className="mb-3 text-sm font-medium text-muted-foreground">Pengujian internal · Development lokal</p>
      <h1 className={typographySystemTokens["editorial-accent"].className}>{title}</h1>
      <div className="mt-6 space-y-6 text-base leading-7">{children}</div>
    </main>
    <footer className="px-5 py-6 text-xs text-muted-foreground sm:px-8">Pengembangan produk · Fabrikasi digital</footer>
  </div>;
}
