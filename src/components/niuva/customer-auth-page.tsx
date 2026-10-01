import Image from "next/image";
import Link from "next/link";
import { Google_Sans } from "next/font/google";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { Mail } from "lucide-react";
import { CustomerGoogleLink } from "./customer-google-link";
import { CustomerEmailForm } from "./customer-email-form";
import { StatusNotice } from "./status-notice";
import { typographySystemTokens } from "@/design/typography";
import { getCurrentCustomer, isCustomerSessionStoreAvailable } from "@/lib/auth/customer";
import { isLocalDemoMode } from "@/lib/env/server";
import { safeCustomerReturnTo } from "@/modules/customer-auth/core";
import { customerEmailCapabilities } from "@/modules/customer-auth/email-capabilities";
import { getCustomerAuthLegalDocuments } from "@/modules/customer-auth/legal";
import { getInternalAuthConfig } from "@/modules/customer-auth/internal-testing";
import { CustomerEmailRepository } from "@/modules/customer-auth/email-repository";
import { PENDING_REGISTRATION_COOKIE } from "@/modules/customer-auth/email-handler";
import { tokenSchema } from "@/modules/customer-auth/password-validation";
import { cn } from "@/lib/utils";

const googleSans = Google_Sans({ display: "swap", subsets: ["latin"], weight: "500", adjustFontFallback: false, fallback: ["Arial", "sans-serif"] });
export type CustomerAuthMode = "login" | "register" | "verify-email" | "forgot-password" | "reset-password";
export type CustomerAuthQuery = { error?: string | string[]; loggedOut?: string | string[]; returnTo?: string | string[]; token?: string | string[]; status?: string | string[] };
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const focus = "rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
const errorMessages: Record<string, string> = {
  auth_failed: "Proses masuk belum selesai atau dibatalkan. Coba lagi dengan metode yang Anda gunakan di Niuva.",
  rate_limited: "Terlalu banyak percobaan. Tunggu beberapa saat lalu coba lagi.",
  unavailable: "Layanan Google sedang tidak tersedia. Gunakan email/password jika akun Anda sudah terdaftar dengan metode tersebut.",
  customer_auth_unavailable: "Layanan ini belum tersedia. Silakan coba lagi nanti.",
  provider_unavailable: "Email belum berhasil dikirim. Silakan coba lagi nanti.",
  unauthorized: "Email atau password belum cocok. Periksa kembali atau gunakan pemulihan password.",
  validation: "Periksa data Anda. Jika tautan sudah kedaluwarsa, minta tautan baru.",
  validation_error: "Tautan tidak valid, sudah digunakan, atau kedaluwarsa. Minta tautan baru.",
  registration_unavailable: "Pendaftaran baru belum tersedia. Jika sudah punya akun, masuk dengan metode yang sebelumnya Anda gunakan.",
  conflict: "Akun ini sudah terdaftar. Masuk dengan metode yang sebelumnya Anda gunakan.",
};
const copy: Record<CustomerAuthMode, { title: string; description: string }> = {
  login: { title: "Selamat datang kembali", description: "Masuk untuk melanjutkan permintaan dan melihat riwayat pesanan Anda." },
  register: { title: "Buat akun Niuva", description: "Satu akun untuk mengelola project, pesanan, dan permintaan produksi Anda." },
  "verify-email": { title: "Periksa email Anda", description: "Verifikasi alamat email untuk menyelesaikan pendaftaran akun Niuva." },
  "forgot-password": { title: "Lupa password?", description: "Masukkan email akun Anda untuk meminta tautan pemulihan password." },
  "reset-password": { title: "Atur password baru", description: "Pilih password baru untuk mengamankan akun Niuva Anda." },
};
export async function CustomerAuthPage({ mode, searchParams }: { mode: CustomerAuthMode; searchParams: Promise<CustomerAuthQuery> }) {
  await connection();
  const params = await searchParams;
  let returnTo = safeCustomerReturnTo(first(params.returnTo));
  const capabilities = customerEmailCapabilities();
  if ((mode === "login" || mode === "register") && isCustomerSessionStoreAvailable() && await getCurrentCustomer()) redirect(returnTo);
  const legal = getCustomerAuthLegalDocuments();
  const internal = getInternalAuthConfig();
  const tokenInput = first(params.token);
  const token = tokenSchema.safeParse(tokenInput).success ? tokenInput : undefined;
  let pending: Awaited<ReturnType<CustomerEmailRepository["findPending"]>> = null;
  let validToken = false;
  if (capabilities.password && (mode === "verify-email" || mode === "reset-password")) {
    const repository = new CustomerEmailRepository();
    if (token) {
      const record = await repository.findToken(token, mode === "verify-email" ? "verify" : "reset", new Date());
      validToken = Boolean(record);
      if (record) returnTo = safeCustomerReturnTo(record.returnTo);
    }
    if (mode === "verify-email") {
      const handle = (await cookies()).get(PENDING_REGISTRATION_COOKIE)?.value;
      if (handle && tokenSchema.safeParse(handle).success) pending = await repository.findPending(handle, new Date());
    }
  }
  const error = first(params.error);
  const status = first(params.status);
  const context = returnTo.split(/[?#]/)[0];
  const description = (mode === "login" || mode === "register") ? ({ "/checkout": "Masuk atau buat akun untuk melanjutkan checkout Anda.", "/custom-print/request": "Masuk atau buat akun untuk melanjutkan permintaan Custom Print Anda.", "/project-brief": "Masuk atau buat akun untuk melanjutkan Project Brief Anda." } as Record<string, string>)[context] ?? copy[mode].description : copy[mode].description;
  const linkClass = cn(focus, "inline-flex min-h-11 items-center text-sm font-medium text-primary underline underline-offset-4");
  return <div className="flex min-h-svh flex-col bg-background font-sans text-foreground" data-foundation-propagation="approved" data-foundation-scope="customer-auth" data-typography-propagation="approved" data-typography-version="1.0" data-product-screen-proof-status="pending-owner-review" data-product-screen-functional={capabilities.password ? "server-backed" : "capability-gated"} data-runtime-mode={isLocalDemoMode() ? "demo" : "standard"}>
    <a href="#main-content" className={cn(focus, "sr-only z-50 bg-background px-4 py-3 focus:not-sr-only focus:fixed focus:left-4 focus:top-4")}>Lewati ke konten utama</a>
    <header className="px-5 py-4 sm:px-8 sm:py-6"><div className="mx-auto flex max-w-public items-center justify-between gap-4">
      <Link href="/" aria-label="Niuva, kembali ke halaman utama" className={cn(focus, "inline-flex min-h-11 shrink-0 items-center")}><Image alt="" className="h-6 w-auto sm:h-7" height={346} width={1831} priority src="/assets/brand/niuva-logo-horizontal-light.svg" /></Link>
      <Link href="/" className={cn(focus, "inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground")}><span aria-hidden="true">←</span>Kembali ke situs</Link>
    </div></header>
    <main id="main-content" tabIndex={-1} className="flex flex-1 justify-center px-5 pb-12 pt-8 outline-none sm:px-8 sm:pb-16 sm:pt-12">
      <section aria-labelledby="customer-auth-title" className="w-full min-w-0 max-w-md" data-customer-auth-content>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Akun Niuva</p>
        <h1 id="customer-auth-title" className={cn(typographySystemTokens["editorial-accent"].className, "mt-4")}>{copy[mode].title}</h1>
        <p className="mt-4 text-base leading-6 text-muted-foreground">{description}</p>
        <div className="mt-8">
          {error ? <StatusNotice className="mb-6" size="compact" tone="error" title="Permintaan belum selesai." description={errorMessages[error] ?? errorMessages.auth_failed} /> : null}
          {first(params.loggedOut) === "1" && !error ? <StatusNotice className="mb-6" size="compact" tone="success" title="Anda sudah keluar." description="Masuk kembali untuk melihat permintaan dan pesanan Anda." /> : null}
          {status === "verified" || status === "password_reset" ? <StatusNotice className="mb-6" size="compact" tone="success" title={status === "verified" ? "Email sudah terverifikasi." : "Password berhasil diperbarui."} description="Silakan masuk ke akun Niuva Anda." /> : null}
          {mode === "login" || mode === "register" ? <>
            {internal ? <p className="mb-6 text-sm leading-6 text-muted-foreground">Pengujian internal untuk pemilik. Gunakan email peserta sesuai metode pendaftaran. Akses akun berlaku 30 hari. <Link className={linkClass} href="/internal-testing/policy?document=privacy">Baca policy pengujian</Link></p> : null}
            {(mode === "register" && !capabilities.registration) || (mode === "login" && !capabilities.password) ? <StatusNotice className="mb-6" size="compact" tone="warning" title={mode === "register" ? "Pendaftaran baru belum tersedia." : "Login email belum tersedia."} description={mode === "register" ? "Pendaftaran dibuka setelah Syarat Layanan, Kebijakan Privasi, dan layanan email tersedia. Jika sudah punya akun, silakan masuk." : "Silakan coba lagi nanti."} /> : null}
            <CustomerEmailForm mode={mode} returnTo={returnTo} available={mode === "register" ? capabilities.registration : capabilities.password} legal={legal} />
            <div className="my-6 flex items-center gap-4" aria-hidden="true"><span className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">atau</span><span className="h-px flex-1 bg-border" /></div>
            <CustomerGoogleLink available={capabilities.google && (mode === "login" || legal !== null)} fontClassName={googleSans.className} href={`${internal && mode === "register" ? "/internal-testing/google-consent" : "/api/auth/google/start"}?returnTo=${encodeURIComponent(returnTo)}`} />
            <p id="customer-auth-helper" className="text-sm leading-5 text-muted-foreground">{!capabilities.google ? "Masuk dengan Google sedang tidak tersedia." : mode === "register" && !legal ? "Pendaftaran dengan Google dibuka setelah dokumen kebijakan tersedia." : "Gunakan metode yang Anda pakai saat mendaftar di Niuva."}</p>
            <p className="mt-6 flex flex-wrap items-center justify-center gap-x-1 text-sm text-muted-foreground">{mode === "register" ? "Sudah punya akun?" : "Belum punya akun?"}<Link href={`${mode === "register" ? "/login" : "/register"}?returnTo=${encodeURIComponent(returnTo)}`} className={cn(linkClass, "min-w-11 px-1")}>{mode === "register" ? "Masuk" : "Daftar"}</Link></p>
          </> : mode === "verify-email" ? <>
            {tokenInput ? validToken && token ? <CustomerEmailForm mode="verify" returnTo={returnTo} token={token} /> : <StatusNotice size="compact" tone="warning" title="Tautan verifikasi tidak dapat digunakan." description="Tautan sudah digunakan, kedaluwarsa, atau tidak valid. Minta tautan baru." /> : null}
            {!tokenInput && pending ? <>
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4"><Mail aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="text-xs text-muted-foreground">{pending.deliveryConfirmed ? "Email verifikasi dikirim ke" : "Alamat email pendaftaran"}</p><p className="mt-1 break-all text-sm font-medium">{pending.email}</p></div></div>
              {pending.deliveryConfirmed ? <p className="mt-3 text-sm text-muted-foreground">Permintaan pengiriman diterima layanan email. Periksa inbox Anda.</p> : <p className="mt-3 text-sm text-muted-foreground">Email belum berhasil dikirim. Coba kirim ulang.</p>}
            </> : !tokenInput ? <StatusNotice size="compact" tone="info" title="Verifikasi email diperlukan." description={status === "registration_received" ? "Jika email Anda sudah terdaftar, masuk dengan metode yang sebelumnya Anda gunakan atau minta pemulihan password." : "Mulai dari halaman Daftar. Tautan verifikasi akan dikirim setelah pendaftaran berhasil diproses."} /> : null}
            <details className="my-6"><summary className={cn(focus, "flex min-h-12 cursor-pointer items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground")}>Buka email</summary><div className="mt-3 flex flex-wrap gap-4"><a href="https://mail.google.com/" target="_blank" rel="noopener noreferrer" className={linkClass}>Gmail<span className="sr-only">, tab baru</span></a><a href="https://outlook.live.com/mail/" target="_blank" rel="noopener noreferrer" className={linkClass}>Outlook<span className="sr-only">, tab baru</span></a></div><p className="text-sm text-muted-foreground">Untuk penyedia lain, buka aplikasi atau situs email Anda.</p></details>
            {pending ? <CustomerEmailForm mode="resend" available={capabilities.delivery} returnTo={returnTo} /> : null}
            <div className="mt-6 text-sm leading-6"><p className="font-medium">Belum menerima email?</p><p className="mt-1 text-muted-foreground">Periksa folder spam dan pastikan alamat email benar. Tautan verifikasi berlaku 24 jam. Kirim ulang tersedia setelah 60 detik.</p></div>
          </> : mode === "forgot-password" ? <>
            {!capabilities.delivery ? <StatusNotice className="mb-6" size="compact" tone="warning" title="Pemulihan password belum tersedia." description="Layanan email belum tersedia. Silakan coba lagi nanti." /> : null}
            {status === "reset_requested" ? <StatusNotice className="mb-6" size="compact" tone="info" title="Permintaan pemulihan diterima." description="Jika alamat tersebut memiliki akun email/password, Anda akan menerima tautan pemulihan. Akun Google tetap masuk melalui Google." /> : null}
            <CustomerEmailForm mode="forgot-password" available={capabilities.delivery} returnTo={returnTo} />
          </> : validToken && token ? <CustomerEmailForm mode="reset-password" returnTo={returnTo} token={token} /> : <StatusNotice size="compact" tone="warning" title="Tautan pemulihan tidak dapat digunakan." description="Tautan sudah digunakan, kedaluwarsa, atau tidak valid. Minta tautan pemulihan baru." />}
          {mode !== "login" && mode !== "register" ? <div className="mt-6 flex flex-wrap justify-center gap-4"><Link className={linkClass} href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Kembali ke Login</Link>{mode === "verify-email" && tokenInput && !validToken ? <Link className={linkClass} href={`/register?returnTo=${encodeURIComponent(returnTo)}`}>Ulangi pendaftaran</Link> : null}{mode === "reset-password" ? <Link className={linkClass} href={`/forgot-password?returnTo=${encodeURIComponent(returnTo)}`}>Minta tautan baru</Link> : null}</div> : null}
        </div>
      </section>
    </main>
    <footer className="px-5 pb-6 sm:px-8"><p className="mx-auto max-w-public text-xs leading-5 text-muted-foreground">Pengembangan produk · Fabrikasi digital</p></footer>
  </div>;
}
