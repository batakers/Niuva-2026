import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/niuva/public-shell";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Icon } from "@/components/ui/Icon";
import { typographySystemTokens as type } from "@/design/typography";
import { publicServices } from "@/features/public/company-content";

export const metadata: Metadata = {
  title: "Layanan · Niuva",
  description:
    "Research & Development, Consultant & Workshop, Design & Prototyping, serta Apparel & Merchandise dari Niuva.",
  robots: { follow: true, index: true },
};

export default function ServicesPage() {
  return (
    <PublicShell scope="services">
      <main id="main-content">
        <section className="border-b border-border bg-card">
          <div className="mx-auto grid max-w-public gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-end">
            <div><p className="text-sm font-medium text-brand-700">Layanan Niuva</p>
              <h1 className={`${type.display.className} mt-4 max-w-3xl`}>Dukungan yang mengikuti tahap proyek Anda.</h1></div>
            <div className="max-w-lg space-y-5 lg:pl-8">
              <p className="text-lg leading-8 text-muted-foreground">Mulai dari kebutuhan yang belum terpetakan, diskusi tim, desain yang perlu diuji, atau produk beridentitas brand. Pilih titik masuk yang paling dekat dengan kondisi Anda.</p>
              <NiuvaLink href="/project-brief" className="min-h-11 gap-2">Diskusikan kebutuhan <Icon aria-hidden="true" className="size-4" name="arrow-up-right" /></NiuvaLink>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-public px-5 py-12 sm:px-8 sm:py-16" aria-labelledby="choose-service-title">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)] lg:items-end">
            <div><p className="text-sm font-medium text-brand-700">Titik mulai</p><h2 id="choose-service-title" className={`${type.heading.className} mt-3`}>Cari layanan dari pekerjaan yang perlu dilakukan.</h2></div>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground">Keempat layanan dapat saling melengkapi. Detailnya membantu Anda melihat input, arah kerja, dan contoh proyek sebelum mengirim brief.</p>
          </div>
          <nav aria-label="Lompat ke layanan" className="mt-8 flex flex-wrap gap-2">
            {publicServices.map((service) => <Link className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 text-sm font-medium underline-offset-4 hover:border-brand-400 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`#${service.slug}`} key={service.slug}>{service.title}</Link>)}
          </nav>
          <div className="mt-10 grid border-t border-border lg:grid-cols-2">
            {publicServices.map((service) => (
              <section key={service.slug} id={service.slug} aria-labelledby={`${service.slug}-title`}
                className="scroll-mt-8 border-b border-border py-8 sm:py-10 lg:odd:pr-10 lg:even:border-l lg:even:pl-10">
                <p className="text-sm font-medium text-brand-700">{service.tags.join(" · ")}</p>
                <h3 id={`${service.slug}-title`} className={`${type.subheading.className} mt-3`}>{service.title}</h3>
                <p className="mt-4 max-w-xl text-lg leading-7">{service.websiteFraming}</p>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">{service.sourceScope}</p>
                <dl className="mt-6 divide-y divide-border border-y border-border">
                  <div className="py-3"><dt className="text-sm font-semibold">Yang bisa Anda bawa</dt><dd className="mt-1 text-sm leading-6 text-muted-foreground">{service.inputs}</dd></div>
                  <div className="py-3"><dt className="text-sm font-semibold">Arah pembahasan</dt><dd className="mt-1 text-sm leading-6 text-muted-foreground">{service.outputs}</dd></div>
                </dl>
                <div className="mt-5 flex flex-wrap gap-3">
                  <NiuvaLink className="min-h-11" href={`/services/${service.slug}`} variant="outline">Lihat detail layanan</NiuvaLink>
                  <NiuvaLink className="min-h-11" href={`/project-brief?service=${encodeURIComponent(service.slug)}`} aria-label={`Buat brief untuk ${service.title.toLowerCase()}`}>Buat brief layanan ini</NiuvaLink>
                </div>
              </section>
            ))}
          </div>
        </section>
        <section className="border-t border-border bg-card">
          <div className="mx-auto grid max-w-public gap-6 px-5 py-12 sm:px-8 sm:py-16 md:grid-cols-2 md:items-center">
            <h2 className={type.heading.className}>Belum tahu harus mulai dari mana?</h2>
            <div><p className="mb-5 text-base leading-7 text-muted-foreground">Tidak perlu menentukan semua detail sekarang. Tujuan dan batasan awal membantu kita memilih pembahasan yang relevan.</p><div className="flex flex-wrap gap-3"><NiuvaLink className="min-h-11" href="/project-brief">Ceritakan konteks proyek</NiuvaLink><NiuvaLink className="min-h-11" href="/projects" variant="outline">Lihat projects</NiuvaLink></div></div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
