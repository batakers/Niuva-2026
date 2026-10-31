import type { Metadata } from "next";
import Link from "next/link";
import { PublicShell } from "@/components/niuva/public-shell";
import { B2BContactLink } from "@/components/niuva/b2b-contact-link";
import { ClosingPanel } from "@/components/niuva/closing-panel";
import { Icon } from "@/components/ui/Icon";
import { typographySystemTokens as type } from "@/design/typography";
import { publicProductTypes, publicServices } from "@/features/public/company-content";
import { mascotRenders } from "@/features/public/mascot";
import { buildPageSocialMetadata } from "@/lib/site-metadata";

const SERVICES_TITLE = "Layanan · Niuva";
const SERVICES_DESCRIPTION =
  "Riset & Pengembangan, Desain & Rekayasa, Prototipe & Manufaktur Digital, serta Konsultansi & Workshop dari Niuva.";

export const metadata: Metadata = {
  title: SERVICES_TITLE,
  description: SERVICES_DESCRIPTION,
  ...buildPageSocialMetadata({
    title: SERVICES_TITLE,
    description: SERVICES_DESCRIPTION,
    path: "/services",
  }),
  robots: { follow: true, index: true },
};

const rowLink = "group flex items-center justify-between gap-6 border-b border-border py-5 transition-colors duration-150 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset";

export default function ServicesPage() {
  return (
    <PublicShell scope="services">
      <main id="main-content">
        {/* The four services, set as one large list, are the first screen's picture. */}
        <section aria-labelledby="services-title" className="mx-auto grid max-w-public gap-12 px-5 pt-14 sm:px-12 sm:pt-20 lg:grid-cols-[minmax(0,35rem)_minmax(0,1fr)] lg:gap-16 xl:grid-cols-[minmax(0,43rem)_minmax(0,1fr)]">
          <div>
            <h1 className={type.display.className} id="services-title">Dukungan yang mengikuti tahap proyek Anda.</h1>
            <p className="mt-5 max-w-[46ch] text-lead leading-[1.6] text-muted-foreground sm:text-lg">Mulai dari kebutuhan yang belum terpetakan, diskusi tim, desain yang perlu diuji, atau produk beridentitas brand. Pilih titik masuk yang paling dekat dengan kondisi Anda.</p>
            <B2BContactLink className="mt-8" />
          </div>
          <nav aria-label="Empat layanan Niuva" className="lg:pt-2">
            <ul className="border-t border-border">
              {publicServices.map((service) => (
                <li key={service.slug}>
                  <a className={rowLink} href={`#${service.slug}`}>
                    <span>
                      <span className="block text-2xl font-normal tracking-[-0.015em] sm:text-3xl">{service.title}</span>
                      <span className="mt-1 block text-ui text-muted-foreground">{service.tags.join(" · ")}</span>
                    </span>
                    <Icon aria-hidden="true" className="size-5 shrink-0 text-brand-700 transition-transform duration-200 group-hover:translate-y-1" name="arrow-down" />
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </section>

        <div className="mx-auto max-w-public px-5 pt-24 sm:px-12 sm:pt-32">
          {publicServices.map((service) => (
            <section
              aria-labelledby={`${service.slug}-title`}
              className="grid scroll-mt-24 gap-6 border-t border-border py-12 sm:py-16 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16"
              id={service.slug}
              key={service.slug}
            >
              <div>
                <h2 className={type.heading.className} id={`${service.slug}-title`}>{service.title}</h2>
                <p className="mt-3 text-ui text-muted-foreground">{service.tags.join(" · ")}</p>
              </div>
              <div>
                <p className="max-w-[44ch] text-xl leading-[1.5] sm:text-2xl sm:leading-[1.45]">{service.websiteFraming}</p>
                <p className="mt-4 max-w-[60ch] text-base leading-[1.6] text-muted-foreground">{service.sourceScope}</p>
                <dl className="mt-8 grid gap-6 sm:grid-cols-2 sm:gap-10">
                  <div><dt className="text-ui font-semibold">Yang bisa Anda bawa</dt><dd className="mt-1.5 text-base leading-[1.55] text-muted-foreground">{service.inputs}</dd></div>
                  <div><dt className="text-ui font-semibold">Arah pembahasan</dt><dd className="mt-1.5 text-base leading-[1.55] text-muted-foreground">{service.outputs}</dd></div>
                </dl>
                <Link className="group mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`/services/${service.slug}`}>
                  Lihat detail {service.title}
                  <Icon aria-hidden="true" className="size-5 text-brand-700 transition-transform duration-200 group-hover:translate-x-1" name="arrow-right" />
                </Link>
              </div>
            </section>
          ))}
        </div>

        {/* Product types from NIUVA Profile 2026: what the services above produce. */}
        <section aria-labelledby="product-types-title" className="mx-auto grid max-w-public gap-10 px-5 pt-16 sm:px-12 sm:pt-24 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
          <div>
            <h2 className={type.heading.className} id="product-types-title">Yang bisa kami buat.</h2>
            <p className="mt-4 max-w-[40ch] text-lead leading-[1.6] text-muted-foreground">Jenis produk yang dikembangkan dan dibuat Niuva bersama klien.</p>
          </div>
          <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
            {publicProductTypes.map((product) => (
              <div key={product.title}>
                <dt className="text-xl font-medium tracking-[-0.01em]">{product.title}</dt>
                <dd className="mt-1.5 max-w-[42ch] text-base leading-[1.55] text-muted-foreground">{product.description}</dd>
                {"href" in product ? (
                  <dd className="mt-2">
                    <Link className="group inline-flex min-h-11 items-center gap-2 rounded-lg font-semibold underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={product.href}>
                      Ajukan lewat Custom 3D Print
                      <Icon aria-hidden="true" className="size-5 text-brand-700 transition-transform duration-200 group-hover:translate-x-1" name="arrow-right" />
                    </Link>
                  </dd>
                ) : null}
              </div>
            ))}
          </dl>
        </section>

        <ClosingPanel id="services-next-title" mascot={mascotRenders.victory} title="Belum tahu harus mulai dari mana?">
          <p className="mt-4 max-w-[40ch] text-lead leading-[1.6] text-white">Ceritakan kebutuhan proyek Anda kepada tim Niuva. Pembahasan kebutuhan dan penawaran dilanjutkan melalui WhatsApp.</p>
          <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
            <B2BContactLink variant="onBrand" />
            <Link className="inline-flex min-h-11 items-center font-semibold text-white underline underline-offset-4 hover:decoration-2" href="/projects">Lihat proyek</Link>
          </div>
        </ClosingPanel>
      </main>
    </PublicShell>
  );
}
