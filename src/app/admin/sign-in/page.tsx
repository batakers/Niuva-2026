import type { Metadata } from "next";
import Link from "next/link";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Admin sign-in · Niuva",
  robots: { follow: false, index: false },
};

function hasClerkPublishableKey(): boolean {
  const value = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return typeof value === "string" && value.trim().length > 0;
}

export default function AdminSignInPage() {
  const clerkConfigured = hasClerkPublishableKey();

  return (
    <main className="min-h-screen bg-background px-5 py-12 text-foreground sm:px-8 sm:py-16" id="main-content">
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(22rem,1fr)] lg:items-start lg:gap-16">
        <section className="space-y-6 lg:pt-8">
          <Link
            className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            href="/"
          >
            <span className="text-sm font-semibold tracking-[0.08em] text-brand-700">NIUVA / ADMIN</span>
          </Link>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Ruang operasional</p>
            <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Masuk untuk mengelola operasi Niuva.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
              Gunakan akun Owner atau Admin yang sudah diaktifkan. Halaman ini tidak menyediakan registrasi admin publik.
            </p>
          </div>
        </section>

        <section aria-labelledby="admin-sign-in-title" className="rounded-2xl border border-border bg-card p-5 shadow-floating sm:p-8">
          <h2 className="sr-only" id="admin-sign-in-title">Form masuk admin</h2>
          {clerkConfigured ? (
            <SignIn
              path="/admin/sign-in"
              routing="path"
              forceRedirectUrl="/admin"
              withSignUp={false}
            />
          ) : (
            <div className="space-y-4" role="alert">
              <p className="text-sm font-semibold">Login admin belum tersedia.</p>
              <p className="text-sm leading-6 text-muted-foreground">
                Integrasi Clerk belum dikonfigurasi pada environment ini. Kembali ke halaman publik atau aktifkan credential staging sebelum smoke test autentikasi.
              </p>
              <Link
                className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                href="/"
              >
                Kembali ke halaman utama
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
