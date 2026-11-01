import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import Link from "next/link";
import { CustomerAuthFrame, customerAuthLinkClass } from "@/components/niuva/customer-auth-page";
import { CustomerGoogleConsentForm } from "@/components/niuva/customer-google-consent-form";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentCustomer } from "@/lib/auth/customer";
import { safeCustomerReturnTo } from "@/modules/customer-auth/core";
import { getPublicCustomerAuthLegalDocuments } from "@/modules/customer-auth/legal";
import { typographySystemTokens } from "@/design/typography";
import { StatusNotice } from "@/components/niuva/status-notice";

export const metadata = { title: "Persetujuan akun Google · Niuva", robots: { index: false, follow: false } };
export default async function GoogleConsentPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; error?: string; continue?: string }> }) {
  await connection();
  const legal = getPublicCustomerAuthLegalDocuments();
  if (!legal) notFound();
  const params = await searchParams;
  const returnTo = safeCustomerReturnTo(params.returnTo);
  if (await getCurrentCustomer()) redirect(returnTo);
  return <CustomerAuthFrame functional="server-backed">
    <section aria-labelledby="customer-auth-title" className="w-full min-w-0 max-w-md" data-customer-auth-content>
      <h1 id="customer-auth-title" className={typographySystemTokens.heading.className}>Sebelum membuat akun Google</h1>
      <p className="mt-3 text-lead leading-[1.6]">Setujui dokumen Niuva untuk akun Google yang akan Anda pilih.</p>
      <p className="mt-2 text-caption leading-[1.45] text-muted-foreground">Pendaftaran publik dengan Google masih dalam pengujian dan belum dibuka. Kebijakan v1.0 sudah disetujui Owner tetapi belum terbit.</p>
      <div className="mt-8 space-y-5 rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-6">
        {params.error ? <StatusNotice size="compact" title={params.error === "rate_limited" ? "Terlalu banyak percobaan. Tunggu beberapa saat." : "Persetujuan tidak dapat digunakan. Periksa pilihan Anda dan ulangi dengan policy yang ditampilkan."} tone="error" /> : null}
        {params.continue === "1" && !params.error
          ? <a className={buttonVariants({ className: "min-h-12 w-full" })} href={`/api/auth/google/start?returnTo=${encodeURIComponent(returnTo)}`}>Lanjutkan ke Google</a>
          : <CustomerGoogleConsentForm returnTo={returnTo} legal={legal} />}
      </div>
      <div className="mt-5 flex justify-center"><Link className={customerAuthLinkClass} href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Kembali ke Login</Link></div>
    </section>
  </CustomerAuthFrame>;
}
