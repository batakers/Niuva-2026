import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { PublicShell } from "@/components/niuva/public-shell";
import { AuLink } from "@/components/ui/AuLink";
import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import { getCuratedPublicContentPreview } from "@/features/frontend-preview/server";
import { publicServices } from "@/features/public/services";

export const metadata: Metadata = { title: "Layanan · Niuva", description: "Riset, konsultasi, desain dan prototyping, serta apparel dan merchandise. Mulai dari konteks yang Anda punya." };

type ServicePageItem = Readonly<{
  description: string;
  editorialStatus: "owner-approved-preview" | "current";
  inputs: string;
  outputs: string;
  question: string;
  slug: string;
  tags: readonly string[];
  title: string;
}>;

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const { preview } = await searchParams;
  const curated = await getCuratedPublicContentPreview(preview);
  const services: readonly ServicePageItem[] = curated
    ? curated.services.map(service => ({
        description: service.sourceScope,
        editorialStatus: "owner-approved-preview",
        inputs:
          "Nama kategori dan ruang lingkup berasal dari company profile Niuva.",
        outputs:
          "Framing website sudah disetujui Owner untuk preview ini. Metode, deliverable, durasi, kapasitas, dan janji produksi tidak diasumsikan.",
        question: service.websiteFraming,
        slug: service.slug,
        tags: ["Ruang lingkup terkonfirmasi", "Framing web disetujui"],
        title: service.title,
      }))
    : publicServices.map(service => ({
        ...service,
        editorialStatus: "current",
      }));

  return (
    <PublicShell scope="services">
      <main id="main-content">
        {curated && (
          <aside
            aria-label="Status preview layanan Niuva"
            className="border-b border-info-border bg-info-background text-info"
          >
            <div className="mx-auto flex max-w-public flex-col gap-2 px-5 py-4 text-sm sm:px-8 lg:flex-row lg:items-center lg:justify-between">
              <p>
                Preview lokal · kategori, ruang lingkup, dan framing web sudah ditinjau; publication production tetap tertutup.
              </p>
              <AuLink href="/?preview=curated" size="sm" variant="outline">
                Kembali ke Homepage
              </AuLink>
            </div>
          </aside>
        )}
        <section className="border-b border-border bg-card">
          <div className="mx-auto grid max-w-public gap-8 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-2 lg:items-end">
            <div><p className="text-sm font-medium text-brand-700">Layanan Niuva</p>
              <h1 className={`${type.display.className} mt-4 max-w-xl`}>Dukungan yang mengikuti tahap proyek Anda.</h1></div>
            <div className="max-w-lg space-y-6 lg:pl-10">
              <p className="text-lg leading-8 text-muted-foreground">Ada yang dimulai dari pertanyaan. Ada yang sudah berbentuk sketsa, model, atau prototype. Kita mulai dari konteks itu.</p>
              <AuLink href="/project-brief" className="min-h-11 gap-2">Diskusikan kebutuhan <ArrowUpRight aria-hidden="true" className="size-4" /></AuLink>
            </div>
          </div>
        </section>
        <div className="mx-auto max-w-public px-5 sm:px-8">
          {services.map((service, index) => (
            <section key={service.slug} id={service.slug} aria-labelledby={service.slug + "-title"}
              className="grid gap-8 border-b border-border py-12 sm:py-16 lg:grid-cols-2 lg:gap-16">
              <div className="space-y-4">
                <p className="text-sm text-brand-700">Layanan {index + 1} / 4</p>
                <h2 id={service.slug + "-title"} className={type.heading.className}>{service.title}</h2>
                <p className="max-w-lg text-xl leading-8 text-muted-foreground">{service.question}</p>
                <ul className="flex flex-wrap gap-2" aria-label="Fokus layanan">{service.tags.map(tag => <li key={tag} className="rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground">{tag}</li>)}</ul>
              </div>
              <div className="space-y-6">
                <p className="text-base leading-7">{service.description}</p>
                <dl className="divide-y divide-border border-y border-border">
                  <div className="py-4"><dt className="text-sm font-semibold">{service.editorialStatus === "owner-approved-preview" ? "Dasar sumber" : "Yang bisa Anda bawa"}</dt><dd className="mt-2 text-sm leading-6 text-muted-foreground">{service.inputs}</dd></div>
                  <div className="py-4"><dt className="text-sm font-semibold">{service.editorialStatus === "owner-approved-preview" ? "Batas editorial" : "Arah pembahasan"}</dt><dd className="mt-2 text-sm leading-6 text-muted-foreground">{service.outputs}</dd></div>
                </dl>
                <AuLink className="min-h-11" href="/project-brief" variant="outline" aria-label={`Buat brief untuk ${service.title.toLowerCase()}`}>Buat brief layanan ini</AuLink>
              </div>
            </section>
          ))}
          <section className="grid gap-6 py-16 md:grid-cols-2 md:items-center">
            <h2 className={type.heading.className}>Belum tahu harus mulai dari mana?</h2>
            <div><p className="mb-5 text-base leading-7 text-muted-foreground">Tidak perlu menentukan semua detail sekarang. Tujuan dan batasan awal membantu kita memilih pembahasan yang relevan.</p><div className="flex flex-wrap gap-3"><AuLink className="min-h-11" href="/project-brief">Ceritakan konteks proyek</AuLink>{curated && <AuLink className="min-h-11" href="/projects?preview=curated" variant="outline">Lihat proyek terkurasi</AuLink>}</div></div>
          </section>
        </div>
      </main>
    </PublicShell>
  );
}
