import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { InternalAuthLayout } from "@/components/niuva/internal-auth-layout";
import { InternalGoogleConsentForm } from "@/components/niuva/internal-google-consent-form";
import { getInternalAuthConfig } from "@/modules/customer-auth/internal-testing";
import { safeCustomerReturnTo } from "@/modules/customer-auth/core";
import Link from "next/link";
export const metadata = { title: "Persetujuan Pengujian Google · Niuva", robots: { index: false, follow: false } };
export default async function GoogleConsent({ searchParams }: { searchParams: Promise<{ returnTo?: string; error?: string; continue?: string }> }) {
  await connection();
  if (!getInternalAuthConfig()) notFound();
  const params = await searchParams;
  const returnTo = safeCustomerReturnTo(params.returnTo);
  if (await getCurrentCustomer()) redirect(returnTo);
  return <InternalAuthLayout title="Sebelum membuat akun Google">
    <p>Akun baru hanya dapat dibuat dengan email Google peserta yang diizinkan. Akses berlaku 30 hari; baca ketentuan dan pemberitahuan privasi pengujian sebelum melanjutkan.</p>
    {params.error ? <p role="alert" className="text-sm text-destructive">{params.error === "rate_limited" ? "Terlalu banyak percobaan. Tunggu 15 menit lalu coba kembali." : "Pendaftaran memerlukan persetujuan yang masih berlaku dan akun Google peserta yang diizinkan. Periksa pilihan akun Anda."}</p> : null}
    {params.continue === "1" && !params.error ? <div className="max-w-md space-y-5"><p>Gunakan tautan berikut untuk melanjutkan proses di Google.</p><a href={`/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`} className="flex min-h-12 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring">Lanjutkan ke Google</a><Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`} className="inline-flex min-h-11 items-center rounded-lg text-primary underline focus-visible:ring-3 focus-visible:ring-ring">Kembali ke Login</Link></div> : <InternalGoogleConsentForm returnTo={returnTo} />}
  </InternalAuthLayout>;
}
