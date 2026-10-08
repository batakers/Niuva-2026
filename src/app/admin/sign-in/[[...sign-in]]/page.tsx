import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { AdminAuthForm } from "@/components/niuva/admin-auth-form";
import { typographySystemTokens } from "@/design/typography";
import { getServerCapabilities } from "@/lib/env/server";

export const metadata: Metadata = { title: "Admin sign-in · Niuva", robots: { follow: false, index: false } };
export const dynamic = "force-dynamic";

export default async function AdminSignInPage({ searchParams = Promise.resolve({}) }: Readonly<{ searchParams?: Promise<Record<string, string | string[] | undefined>> }> = {}) {
  const query = await searchParams;
  const resetToken = query.flow === "reset" && typeof query.token === "string" && query.token.length <= 512 ? query.token : "";
  let configured = false;
  try { const capabilities = getServerCapabilities(); configured = capabilities.adminAuth && capabilities.database; } catch { configured = false; }
  const focusClass = "rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  return (
    <div className="flex min-h-dvh flex-col bg-neutral-100 text-foreground" data-product-screen-proof-status="pending-owner-review">
      <header className="px-5 py-4 sm:px-8 sm:py-6">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
          <Link aria-label="Niuva, kembali ke halaman utama" className={`${focusClass} inline-flex min-h-11 shrink-0 items-center`} href="/">
            <Image alt="" className="h-6 w-auto sm:h-7" height={346} priority src="/assets/brand/niuva-logo-horizontal-light.svg" width={1831} />
          </Link>
          <Link className={`${focusClass} inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground motion-reduce:transition-none`} href="/">
            <ArrowLeft aria-hidden="true" className="size-4 shrink-0" />
            Kembali ke situs
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-8 outline-none sm:px-8 sm:py-12" id="main-content" tabIndex={-1}>
        <div className="w-full min-w-0 max-w-md">
          <section aria-label="Form masuk Admin" className="min-w-0 rounded-xl bg-card p-6 shadow-floating ring-1 ring-border sm:p-8">
            {configured ? <AdminAuthForm resetToken={resetToken} invitation={query.flow === "invite"} verified={query.verified === "1"} passwordChanged={query.flow === "password-updated"}/> : <div role="alert" className="space-y-3"><h1 className={typographySystemTokens.subheading.className}>Login Admin belum tersedia.</h1><p className="text-base leading-6 text-muted-foreground">Konfigurasi autentikasi Admin belum lengkap. Hubungi Owner untuk menyiapkan layanan login.</p></div>}
            <div className="mt-8 flex items-start gap-3 border-t border-border pt-6">
              <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
              <p className="text-sm leading-6 text-muted-foreground">Akses Dashboard memerlukan password dan kode dari aplikasi authenticator Anda.</p>
            </div>
          </section>
          <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">Halaman ini tidak menyediakan registrasi admin publik.</p>
        </div>
      </main>
    </div>
  );
}
