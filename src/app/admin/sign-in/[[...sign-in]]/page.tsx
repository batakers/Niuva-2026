import type { Metadata } from "next";
import Link from "next/link";
import NiuvaLogo from "@/components/ui/NiuvaLogo";
import { AdminAuthForm } from "@/components/niuva/admin-auth-form";
import { getServerCapabilities } from "@/lib/env/server";

export const metadata: Metadata = { title: "Admin sign-in · Niuva", robots: { follow: false, index: false } };
export const dynamic = "force-dynamic";

export default async function AdminSignInPage({ searchParams = Promise.resolve({}) }: Readonly<{ searchParams?: Promise<Record<string, string | string[] | undefined>> }> = {}) {
  const query = await searchParams;
  const resetToken = query.flow === "reset" && typeof query.token === "string" && query.token.length <= 512 ? query.token : "";
  let configured = false;
  try { const capabilities = getServerCapabilities(); configured = capabilities.adminAuth && capabilities.database; } catch { configured = false; }
  return (
    <main className="min-h-dvh bg-neutral-100 px-4 py-6 text-foreground sm:px-8 sm:py-10" id="main-content">
      <div className="mx-auto w-full max-w-5xl rounded-xl border border-border bg-card p-5 sm:p-8">
        <header className="flex flex-wrap items-center gap-3 border-b border-border pb-5">
          <Link className="inline-flex rounded-lg bg-neutral-900 px-2 py-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/"><NiuvaLogo className="h-6 w-auto" priority /></Link>
          <span className="text-sm font-medium text-muted-foreground">Operations / Admin</span>
        </header>
        <div className="mt-8 grid gap-8 lg:grid-cols-2 lg:items-start lg:gap-12">
          <section className="min-w-0 space-y-6 lg:pt-4">
            <p className="text-sm font-medium text-muted-foreground">Ruang operasional</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Masuk untuk mengelola operasi Niuva.</h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">Gunakan akun Owner atau Admin yang sudah diaktifkan. Halaman ini tidak menyediakan registrasi admin publik.</p>
            <p className="text-sm leading-6 text-muted-foreground">Akses Dashboard memerlukan password dan kode dari aplikasi authenticator Anda.</p>
          </section>
          <section aria-label="Form masuk Admin" className="min-w-0 rounded-xl border border-border bg-background p-5 sm:p-8">
            {configured ? <AdminAuthForm resetToken={resetToken} verified={query.verified === "1"} passwordChanged={query.flow === "password-updated"}/> : <div role="alert" className="space-y-3"><p className="text-sm font-semibold">Login Admin belum tersedia.</p><p className="text-sm leading-6 text-muted-foreground">Konfigurasi autentikasi Admin belum lengkap. Hubungi Owner untuk menyiapkan layanan login.</p></div>}
          </section>
        </div>
      </div>
    </main>
  );
}
