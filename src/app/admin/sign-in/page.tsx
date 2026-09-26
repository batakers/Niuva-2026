import type { Metadata } from "next";
import Link from "next/link";
import { ClerkDegraded, ClerkFailed, ClerkLoaded, ClerkLoading, SignIn } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "Admin sign-in · Niuva",
  robots: { follow: false, index: false },
};

function hasClerkPublishableKey(): boolean {
  const value = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  return typeof value === "string" && value.trim().length > 0;
}

function ClerkUnavailableNotice() {
  return (
    <div className="space-y-4" role="alert">
      <p className="text-sm font-semibold">Layanan login belum dapat dimuat.</p>
      <p className="text-sm leading-6 text-muted-foreground">
        Layanan autentikasi Clerk tidak dapat diakses dari browser ini. Periksa koneksi atau izin browser untuk layanan Clerk Development, lalu coba lagi.
      </p>
      <Link
        className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        href="/admin/sign-in"
      >
        Coba lagi
      </Link>
    </div>
  );
}

export default function AdminSignInPage() {
  const clerkConfigured = hasClerkPublishableKey();

  return (
    <main className="min-h-screen bg-background px-5 py-12 text-foreground sm:px-8 sm:py-16" id="main-content">
      <div className="mx-auto grid w-full max-w-6xl gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(22rem,1fr)] lg:items-start lg:gap-16">
        <section className="min-w-0 space-y-6 lg:pt-8">
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

        <section aria-labelledby="admin-sign-in-title" className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-floating sm:p-8">
          <h2 className="sr-only" id="admin-sign-in-title">Form masuk admin</h2>
          {clerkConfigured ? (
            <>
              <ClerkLoading>
                <div aria-live="polite" className="space-y-4" role="status">
                  <div aria-hidden="true" className="motion-safe:animate-pulse space-y-3">
                    <div className="h-11 rounded-lg bg-muted" />
                    <div className="h-11 rounded-lg bg-muted" />
                    <div className="h-11 w-2/3 rounded-lg bg-muted" />
                  </div>
                  <p className="text-sm text-muted-foreground">Memuat layanan login…</p>
                </div>
              </ClerkLoading>
              <ClerkFailed>
                <ClerkUnavailableNotice />
              </ClerkFailed>
              <ClerkDegraded>
                <ClerkUnavailableNotice />
              </ClerkDegraded>
              <ClerkLoaded>
                <SignIn
                  appearance={{
                    options: {
                      elevation: "flush",
                    },
                    variables: {
                      colorPrimary: "var(--primary)",
                      colorPrimaryForeground: "var(--primary-foreground)",
                      colorDanger: "var(--destructive)",
                      colorForeground: "var(--foreground)",
                      colorMuted: "var(--muted)",
                      colorMutedForeground: "var(--muted-foreground)",
                      colorBackground: "var(--background)",
                      colorInput: "var(--card)",
                      colorInputForeground: "var(--foreground)",
                      colorBorder: "var(--border)",
                      colorRing: "var(--ring)",
                      colorShadow: "transparent",
                      fontFamily: "var(--font-body-token)",
                      fontFamilyButtons: "var(--font-body-token)",
                      borderRadius: "var(--radius-control)",
                    },
                    elements: {
                      rootBox: {
                        width: "100%",
                        maxWidth: "100%",
                      },
                      cardBox: {
                        width: "100%",
                        maxWidth: "100%",
                      },
                      card: {
                        width: "100%",
                        maxWidth: "100%",
                        padding: "0",
                        border: "0",
                        borderRadius: "0",
                        boxShadow: "none",
                        backgroundColor: "transparent",
                      },
                      socialButtonsBlockButton: {
                        minHeight: "44px",
                        padding: "12px 16px",
                        boxShadow: "none !important",
                        border: "1px solid var(--border) !important",
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                        "&:focus-visible": {
                          outline: "3px solid var(--ring)",
                          outlineOffset: "2px",
                          boxShadow: "none",
                        },
                      },
                      formFieldInput: {
                        minHeight: "44px",
                        padding: "12px 16px",
                        borderColor: "var(--border)",
                        color: "var(--foreground)",
                        backgroundColor: "var(--card)",
                        "&:focus-visible": {
                          outline: "3px solid var(--ring)",
                          outlineOffset: "2px",
                          boxShadow: "none",
                        },
                      },
                      formButtonPrimary: {
                        minHeight: "44px",
                        padding: "12px 16px",
                        boxShadow: "none !important",
                        backgroundColor: "var(--primary)",
                        color: "var(--primary-foreground)",
                        "&:focus-visible": {
                          outline: "3px solid var(--ring)",
                          outlineOffset: "2px",
                          boxShadow: "none",
                        },
                      },
                    },
                  }}
                  path="/admin/sign-in"
                  routing="path"
                  forceRedirectUrl="/admin"
                  withSignUp={false}
                />
              </ClerkLoaded>
            </>
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
