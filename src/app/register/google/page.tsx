import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { CustomerGoogleConsentForm } from "@/components/niuva/customer-google-consent-form";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { safeCustomerReturnTo } from "@/modules/customer-auth/core";
import { getPublicCustomerAuthLegalDocuments } from "@/modules/customer-auth/legal";
import { typographySystemTokens } from "@/design/typography";

export const metadata = { title: "Persetujuan akun Google · Niuva", robots: { index: false, follow: false } };
export default async function GoogleConsentPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; error?: string; continue?: string }> }) {
  await connection();
  const legal = getPublicCustomerAuthLegalDocuments();
  if (!legal) notFound();
  const params = await searchParams;
  const returnTo = safeCustomerReturnTo(params.returnTo);
  if (await getCurrentCustomer()) redirect(returnTo);
  return <main id="main-content" className="mx-auto min-h-svh w-full max-w-md space-y-6 px-5 py-12 text-foreground">
    <Link className="inline-flex min-h-11 items-center rounded-lg text-primary underline focus-visible:ring-3 focus-visible:ring-ring" href="/">Kembali ke Niuva</Link>
    <h1 className={typographySystemTokens["editorial-accent"].className}>Sebelum membuat akun Google</h1>
    <p className="text-sm leading-6 text-muted-foreground">Pengujian lokal pendaftaran publik. Policy v1.0 sudah disetujui Owner; publikasi dan aktivasi layanan masih tertutup.</p>
    {params.error ? <p role="alert" className="text-sm text-destructive">{params.error === "rate_limited" ? "Terlalu banyak percobaan. Tunggu beberapa saat." : "Persetujuan tidak dapat digunakan. Periksa pilihan Anda dan ulangi dengan policy yang ditampilkan."}</p> : null}
    {params.continue === "1" && !params.error ? <a className="flex min-h-12 items-center justify-center rounded-lg bg-primary px-4 font-medium text-primary-foreground focus-visible:ring-3 focus-visible:ring-ring" href={`/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`}>Lanjutkan ke Google</a> : <CustomerGoogleConsentForm returnTo={returnTo} legal={legal} />}
    <Link className="inline-flex min-h-11 items-center rounded-lg text-primary underline focus-visible:ring-3 focus-visible:ring-ring" href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Kembali ke Login</Link>
  </main>;
}
