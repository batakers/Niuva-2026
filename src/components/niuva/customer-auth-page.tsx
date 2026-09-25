import { redirect } from "next/navigation";
import { connection } from "next/server";

import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { AuLink } from "@/components/ui/AuLink";
import {
  getCurrentCustomer,
  isCustomerAuthAvailable,
} from "@/lib/auth/customer";
import { safeCustomerReturnTo } from "@/modules/customer-auth/core";

type CustomerAuthMode = "login" | "register";

type CustomerAuthSearchParams = Promise<{
  error?: string | string[];
  loggedOut?: string | string[];
  returnTo?: string | string[];
}>;

const errorMessages: Readonly<Record<string, string>> = {
  auth_failed: "Login Google belum berhasil. Coba lagi dengan akun Google yang memiliki email terverifikasi.",
  rate_limited: "Terlalu banyak percobaan login. Tunggu beberapa saat lalu coba lagi.",
  unavailable: "Login Google belum tersedia pada environment ini.",
};

function firstQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export async function CustomerAuthPage({
  mode,
  searchParams,
}: {
  mode: CustomerAuthMode;
  searchParams: CustomerAuthSearchParams;
}) {
  await connection();
  const params = await searchParams;
  const returnTo = safeCustomerReturnTo(firstQueryValue(params.returnTo));
  const authAvailable = isCustomerAuthAvailable();

  if (authAvailable && (await getCurrentCustomer()) !== null) {
    redirect(returnTo);
  }

  const isRegister = mode === "register";
  const alternatePath = isRegister ? "/login" : "/register";
  const alternateLabel = isRegister ? "Sudah punya akun? Login" : "Belum punya akun? Daftar";
  const oauthUrl = `/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`;
  const error = firstQueryValue(params.error);
  const notice = error === undefined ? undefined : errorMessages[error];
  const loggedOut = firstQueryValue(params.loggedOut) === "1";

  return (
    <PublicShell
      functionalStatus={authAvailable ? "server-backed" : "capability-gated"}
      scope="customer-auth"
    >
      <main id="main-content">
        <section className="mx-auto max-w-public px-5 py-14 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-xl">
            <p className="text-sm font-medium text-brand-700">Akun Customer</p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
              {isRegister ? "Buat akun dengan Google." : "Masuk ke akun Niuva."}
            </h1>
            <p className="mt-5 text-base leading-7 text-muted-foreground">
              Gunakan satu Google account untuk melihat profil dan riwayat order, serta melanjutkan checkout.
              Tidak ada password Niuva yang disimpan.
            </p>

            {loggedOut ? (
              <StatusNotice
                className="mt-8"
                tone="success"
                title="Anda sudah logout."
                description="Session Customer telah ditutup pada browser ini."
              />
            ) : null}
            {notice ? (
              <StatusNotice
                className="mt-8"
                tone={error === "unavailable" ? "warning" : "error"}
                title="Login Google belum selesai."
                description={notice}
              />
            ) : null}

            {authAvailable ? (
              <div className="mt-8 space-y-4">
                <AuLink href={oauthUrl} className="min-h-12 w-full sm:w-auto">
                  Lanjutkan dengan Google
                </AuLink>
                <p className="text-sm text-muted-foreground">
                  {isRegister
                    ? "Login Google pertama akan membuat profil Customer secara otomatis."
                    : "Anda akan kembali ke halaman tujuan setelah login berhasil."}
                </p>
              </div>
            ) : (
              <StatusNotice
                className="mt-8"
                tone="warning"
                title="Konfigurasi Google OAuth belum lengkap."
                description="Lengkapi GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, dan GOOGLE_REDIRECT_URI di environment non-production."
              />
            )}

            <AuLink
              href={`${alternatePath}?returnTo=${encodeURIComponent(returnTo)}`}
              variant="link"
              className="mt-6 min-h-11 px-0"
            >
              {alternateLabel}
            </AuLink>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
