import type { Metadata } from "next";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { requireCustomer } from "@/lib/auth/customer";
import { isAppError } from "@/modules/shared/errors";
import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { isLocalDemoMode, getServerCapabilities } from "@/lib/env/server";
import { typographySystemTokens as type } from "@/design/typography";
import { publicServices } from "@/features/public/company-content";
import { buildPageSocialMetadata } from "@/lib/site-metadata";
import { BriefForm } from "./brief-form";

const BRIEF_TITLE = "Project brief · Niuva";
const BRIEF_DESCRIPTION =
  "Susun konteks, tujuan, dan referensi awal untuk percakapan proyek bersama Niuva.";

export const metadata: Metadata = {
  title: BRIEF_TITLE,
  description: BRIEF_DESCRIPTION,
  ...buildPageSocialMetadata({
    title: BRIEF_TITLE,
    description: BRIEF_DESCRIPTION,
    path: "/project-brief",
  }),
};

export default async function ProjectBriefPage({ searchParams }: Readonly<{
  searchParams: Promise<{ service?: string | string[] }>;
}>) {
  await connection();
  const params = await searchParams;
  const serviceSlug = Array.isArray(params.service) ? params.service[0] : params.service;
  const initialService = publicServices.find((service) => service.slug === serviceSlug)?.slug;
  const returnTo = initialService ? `/project-brief?service=${encodeURIComponent(initialService)}` : "/project-brief";
  let customer;
  try { customer = await requireCustomer(); }
  catch (error) {
    if (isAppError(error) && error.code === "UNAUTHORIZED") redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    if (isAppError(error) && error.code === "CUSTOMER_AUTH_UNAVAILABLE") return <PublicShell scope="project-brief" functionalStatus="capability-gated"><main id="main-content" className="mx-auto max-w-public px-5 py-16 sm:px-8"><StatusNotice title="Login Customer belum tersedia" description="Project Brief memerlukan login Customer sebelum dapat dikirim pada runtime ini." tone="warning" /></main></PublicShell>;
    throw error;
  }
  const demoMode = isLocalDemoMode();
  let uploadsEnabled = false;
  try {
    uploadsEnabled = getServerCapabilities().customUploads;
  } catch {
    // Upload stays disabled for incomplete private-storage configuration.
  }

  return (
    <PublicShell scope="project-brief">
      <main id="main-content">
        <section className="mx-auto grid max-w-public gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-2 lg:items-start lg:gap-16">
          <div className="lg:sticky lg:top-8">
            <p className="text-sm font-medium text-brand-700">Project brief</p>
            <h1 className={`${type.display.className} mt-4`}>Buat langkah awal proyek jadi jelas.</h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">Ceritakan konteks, tujuan, dan tahap proyek. Detail yang belum pasti bisa menjadi bahan percakapan berikutnya.</p>
            <p className={`${type["editorial-accent"].className} mt-8 max-w-lg text-brand-900`}
              data-font-family="fraunces" style={{ fontFamily: "var(--font-public-editorial), Georgia, serif", fontOpticalSizing: "auto", fontSynthesis: "none" }}>
              Keputusan yang baik dimulai dari konteks yang cukup.
            </p>
            <div className="mt-10 border-t border-border pt-6">
              <h2 className={type.subheading.className}>Yang perlu disiapkan</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                <li>Tujuan, tahap saat ini, dan batasan proyek.</li>
                <li>Perkiraan jumlah; tanggal target boleh menyusul jika belum diketahui.</li>
                <li>Pada tahap selain ide, siapkan link atau lampiran referensi.</li>
              </ul>
            </div>
          </div>
          <BriefForm customerEmail={customer.email} demoMode={demoMode} initialService={initialService} uploadsEnabled={uploadsEnabled} />
        </section>
        <section className="border-t border-border bg-card">
          <div className="mx-auto grid max-w-public gap-8 px-5 py-12 sm:px-8 md:grid-cols-2">
            <h2 className={type.heading.className}>Setelah pengiriman</h2>
            <ol className="divide-y divide-border">
              {[["Brief tercatat", "Anda menerima nomor referensi untuk menandai konteks yang masuk ke Niuva."], ["Review di Action Queue", "Tim meninjau brief baru dan menentukan percakapan atau tindak lanjut yang relevan."], ["Konfirmasi via WhatsApp", "Gunakan nomor referensi saat melanjutkan percakapan agar konteks tetap tersambung."]].map(([title, text],index) => <li key={title} className="py-4 first:pt-0"><h3 className="text-base font-semibold">{index + 1}. {title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></li>)}
            </ol>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
