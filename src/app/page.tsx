import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { PublicShell } from "@/components/niuva/public-shell";
import { B2BContactLink } from "@/components/niuva/b2b-contact-link";
import { typographySystemTokens } from "@/design/typography";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Icon } from "@/components/ui/Icon";
import { getProjectPreview } from "@/features/frontend-preview/server";
import { publicCompanyProfile, publicServices } from "@/features/public/company-content";
import { buildPageSocialMetadata } from "@/lib/site-metadata";
import { getPublicSiteInformation } from "@/modules/site-information/public-reader";
import { DriftCard, HeroStageWord, LeaningMascot, ProcessScene, type ProcessStage } from "./home-motion";

const headingToken = typographySystemTokens.heading.className;

// The approved headline ends with "prototipe."; the visual word cycles through the
// promise (Owner Q23, 31 Oct 2026) while the heading keeps the approved text for AT.
const headlineLead = "Mitra pengembangan produk dari riset hingga";
const stageWords = ["prototipe", "desain", "produk nyata"] as const;

const mascot = {
  halo: "/assets/mascot/niuva-mascot-halo.webp",
  collaborate: "/assets/mascot/niuva-mascot-collaborate.webp",
  design: "/assets/mascot/niuva-mascot-design.webp",
  present: "/assets/mascot/niuva-mascot-present.webp",
  build: "/assets/mascot/niuva-mascot-build.webp",
  victory: "/assets/mascot/niuva-mascot-victory.webp",
  idea: "/assets/mascot/niuva-mascot-ide.webp",
} as const;

const processStages: readonly ProcessStage[] = [
  { title: "Ide", description: "Tujuan, konteks pengguna, dan batasan awal dipetakan bersama.", image: mascot.idea, alt: "Maskot Niuva dengan ikon bohlam di layar wajah, menunjuk ke samping" },
  { title: "Desain", description: "Arah produk diterjemahkan menjadi bentuk dan detail yang dapat ditinjau.", image: mascot.design, alt: "Maskot Niuva memegang laptop" },
  { title: "Prototipe", description: "Konsep diuji melalui iterasi fisik, termasuk cetak 3D di workshop.", image: mascot.build, alt: "Maskot Niuva memegang kunci inggris" },
  { title: "Produk jadi", description: "Hasil dikembangkan menuju produk nyata dengan dukungan manufaktur yang relevan.", image: mascot.victory, alt: "Maskot Niuva mengangkat kedua tangan" },
];

const doors = [
  { href: "/services", title: "Layanan", description: "Diskusikan kebutuhan proyek B2B" },
  { href: "/custom-print", title: "Custom 3D Print", description: "Kirim model untuk direview" },
  { href: "/shop", title: "Toko", description: "Produk ready-made" },
] as const;

const factCard = "w-66 rounded-[var(--radius-control)] bg-card p-4 text-foreground shadow-floating";

export async function generateMetadata(): Promise<Metadata> {
  const siteInformation = await getPublicSiteInformation();
  return {
    title: "Niuva",
    description: siteInformation.shortDescription,
    ...buildPageSocialMetadata({
      title: "Niuva",
      description: siteInformation.shortDescription,
      path: "/",
    }),
    robots: { follow: true, index: true },
  };
}

// Time-based revalidation (render-strategy.md, 9.13). Must stay a static
// literal. `revalidatePath("/")` in admin actions invalidates this entry.
export const revalidate = 300;

function ArrowRight() {
  return <Icon aria-hidden="true" className="size-5 shrink-0 text-brand-700 transition-transform duration-200 group-hover:translate-x-1" name="arrow-right" />;
}

export default async function Home() {
  const siteInformation = await getPublicSiteInformation();
  // Portfolio evidence is additive; a database outage must not take down the
  // company narrative and the primary contact paths on the homepage.
  const { projects } = await getProjectPreview(undefined).catch(() => ({ projects: [] as const }));
  const listedProjects = projects.filter((project) => project.detailReadiness !== "card-only").slice(0, 4);

  return (
    <PublicShell scope="homepage">
      <main id="main-content">
        <section
          aria-labelledby="hero-title"
          className="relative mx-3 overflow-hidden rounded-[var(--radius-media)] bg-[radial-gradient(130%_70%_at_50%_100%,var(--brand-400)_0%,var(--brand-600)_32%,var(--brand-700)_62%,var(--brand-800)_100%)] lg:bg-[radial-gradient(70%_110%_at_80%_35%,var(--brand-400)_0%,var(--brand-600)_30%,var(--brand-700)_58%,var(--brand-800)_100%)] text-white sm:mx-6 lg:h-155"
          data-home-section="hero"
          id="hero"
        >
          <div className="relative z-10 px-6 pt-10 sm:px-12 lg:absolute lg:inset-y-0 lg:left-0 lg:flex lg:w-[50%] lg:flex-col lg:justify-center lg:pr-4 lg:pl-16 lg:pt-0">
            <h1 className={`${typographySystemTokens.display.className} text-balance`} id="hero-title">
              <span className="sr-only">{publicCompanyProfile.headline}</span>
              <span aria-hidden="true">{headlineLead} <HeroStageWord words={stageWords} />.</span>
            </h1>
            <p className="mt-5 max-w-[44ch] text-base leading-[1.6] text-white sm:text-lg">{siteInformation.shortDescription}</p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <B2BContactLink variant="onBrand" />
              <Link className="inline-flex min-h-11 items-center font-semibold text-white underline underline-offset-4 hover:decoration-2" href="/services">Lihat layanan</Link>
            </div>
          </div>
          <div className="relative h-64 lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto lg:w-[58%]">
            <LeaningMascot
              alt="Maskot Niuva melambaikan tangan"
              className="absolute -bottom-7.5 left-1/2 h-[108%] -translate-x-1/2 lg:-bottom-11.5 lg:h-[112%]"
              src={mascot.halo}
            />
            <DriftCard className="absolute top-21 right-[9%] z-20 hidden lg:block" depth={0.5}>
              <div className={factCard}>
                <p className="text-base font-semibold">Kirim STL, 3MF, atau OBJ</p>
                <p className="mt-1 text-caption leading-[1.45] text-muted-foreground">Setiap model direview operator sebelum quote dikirim.</p>
              </div>
            </DriftCard>
            <DriftCard className="absolute bottom-18 left-[11%] z-20 hidden lg:block" depth={-0.35}>
              <div className={factCard}>
                <p className="text-base font-semibold">Estimasi awal, bukan harga final</p>
                <p className="mt-1 text-caption leading-[1.45] text-muted-foreground">Harga final mengikuti hasil slicing operator.</p>
              </div>
            </DriftCard>
          </div>
        </section>

        <nav aria-label="Titik mulai" className="mx-3 mt-3 flex flex-wrap gap-2 sm:mx-6 md:mt-4 md:grid md:grid-cols-3 md:gap-3.5" data-home-section="entry-paths">
          {doors.map((door) => (
            <Link key={door.href} href={door.href} className="group flex min-h-11 items-center justify-between gap-4 rounded-full border border-border bg-card px-4 py-2 transition-[border-color,translate] duration-200 hover:-translate-y-0.5 hover:border-brand-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:rounded-[var(--radius-card)] md:px-6 md:py-5">
              <span>
                <span className="block text-ui font-semibold md:text-lg">{door.title}</span>
                <span className="mt-0.5 hidden text-sm text-muted-foreground md:block">{door.description}</span>
              </span>
              <span className="hidden md:block"><ArrowRight /></span>
            </Link>
          ))}
        </nav>

        <section aria-labelledby="starting-points-title" className="mx-auto max-w-public px-5 pt-24 sm:px-12 sm:pt-32" data-home-section="starting-points">
          <h2 className={headingToken} id="starting-points-title">Mulai dari apa yang sudah Anda punya.</h2>
          <p className="mt-3.5 max-w-[56ch] text-lead leading-[1.6] text-muted-foreground sm:text-lg">Ide untuk dikembangkan, model untuk dicetak, atau produk siap pakai.</p>

          <div className="mt-12 grid gap-16 sm:mt-16 sm:gap-10">
            <article className="grid items-center gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
              <div>
                <h3 className="text-2xl font-medium tracking-[-0.015em] sm:text-3xl">Punya ide atau proyek?</h3>
                <p className="mt-3 max-w-[44ch] text-lead leading-[1.65] text-muted-foreground">Ceritakan tujuan, tahap saat ini, dan bahan awal Anda. Tim Niuva membahas kebutuhan, ruang lingkup, dan langkah berikutnya langsung lewat WhatsApp.</p>
                <B2BContactLink className="mt-5" />
              </div>
              <div className="relative h-85 overflow-hidden rounded-[var(--radius-media)] bg-brand-100 sm:h-105">
                <Image alt="Maskot Niuva menunjuk ke depan" className="absolute -bottom-2 left-1/2 h-[112%] w-auto -translate-x-1/2 object-contain" height={1400} sizes="(max-width: 1024px) 90vw, 560px" src={mascot.collaborate} width={1400} />
                <p className="absolute top-6 left-6 max-w-64 rounded-xl bg-card p-3.5 text-caption leading-[1.45] shadow-floating">Contoh: “Kami butuh prototipe casing untuk perangkat baru.”</p>
                <p className="absolute right-6 bottom-8 max-w-64 rounded-xl bg-card p-3.5 text-caption leading-[1.45] shadow-floating">Niuva: “Bisa. Kirim sketsa atau CAD-nya, kita bahas ruang lingkupnya dulu.”</p>
              </div>
            </article>

            <article className="grid items-center gap-6 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
              <div className="lg:order-last">
                <h3 className="text-2xl font-medium tracking-[-0.015em] sm:text-3xl">Sudah punya model 3D?</h3>
                <p className="mt-3 max-w-[44ch] text-lead leading-[1.65] text-muted-foreground">Unggah STL, 3MF, atau OBJ secara privat. Operator memeriksa model dan hasil slicing sebelum quote dikirim, jadi Anda menyetujui harga yang sudah diverifikasi.</p>
                <NiuvaLink className="mt-5" href="/custom-print" variant="outline">Ajukan untuk Review</NiuvaLink>
              </div>
              <div className="relative h-85 overflow-hidden rounded-[var(--radius-media)] bg-brand-100 sm:h-105">
                <Image alt="Maskot Niuva memegang laptop" className="absolute -bottom-2 left-1/2 h-[112%] w-auto -translate-x-1/2 object-contain" height={1400} sizes="(max-width: 1024px) 90vw, 560px" src={mascot.design} width={1400} />
                <div className="absolute top-6 left-6 min-w-60 rounded-xl bg-card p-3.5 text-caption shadow-floating">
                  <div className="flex items-center gap-2.5"><span><b className="font-semibold">casing-v2.stl</b> <span className="text-muted-foreground">(contoh)</span></span><span className="ml-auto rounded-full bg-warning-background px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-warning">Perlu review</span></div>
                </div>
                <div className="absolute right-6 bottom-8 rounded-xl bg-card px-3.5 py-3 text-caption shadow-floating">Estimasi awal, bukan harga final.</div>
              </div>
            </article>

            <article className="grid items-center gap-6 lg:grid-cols-[1fr_1.1fr] lg:gap-14">
              <div>
                <h3 className="text-2xl font-medium tracking-[-0.015em] sm:text-3xl">Cari produk siap pakai?</h3>
                <p className="mt-3 max-w-[44ch] text-lead leading-[1.65] text-muted-foreground">Pilih produk ready-made dan variannya di Toko. Harga, stok, dan ongkir diperiksa ulang saat checkout.</p>
                <NiuvaLink className="mt-5" href="/shop" variant="outline">Lihat Toko</NiuvaLink>
              </div>
              <div className="relative h-85 overflow-hidden rounded-[var(--radius-media)] bg-brand-100 sm:h-105">
                <Image alt="Maskot Niuva memegang tablet" className="absolute -bottom-2 left-1/2 h-[112%] w-auto -translate-x-1/2 object-contain" height={1400} sizes="(max-width: 1024px) 90vw, 560px" src={mascot.present} width={1400} />
                <p className="absolute top-6 left-6 max-w-64 rounded-xl bg-card p-3.5 text-caption leading-[1.45] shadow-floating">Varian, harga, dan stok tampil di setiap produk sebelum Anda menambah ke keranjang.</p>
              </div>
            </article>
          </div>
        </section>

        <section aria-labelledby="process-title" className="mx-3 mt-24 rounded-[var(--radius-media)] border border-border bg-card sm:mx-6 sm:mt-32" data-home-section="process">
          <ProcessScene
            heading={<h2 className={`${headingToken} pt-8 lg:pt-0`} id="process-title">Dari ide menjadi produk nyata.</h2>}
            stages={processStages}
          />
        </section>

        <section aria-labelledby="capabilities-title" className="mx-auto max-w-public px-5 pt-24 sm:px-12 sm:pt-32" data-home-section="capabilities">
          <h2 className={headingToken} id="capabilities-title">Empat layanan untuk setiap tahap proyek.</h2>
          <div className="mt-10 overflow-hidden rounded-[var(--radius-media)] border border-border bg-card">
            {publicServices.map((service) => (
              <Link key={service.slug} href={`/services/${service.slug}`} className="group grid gap-x-7 gap-y-1.5 border-t border-border px-5 py-6 transition-colors first:border-t-0 hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset sm:px-9 md:grid-cols-[21rem_1fr_2rem] md:items-center md:py-7">
                <h3 className="text-xl font-medium tracking-[-0.01em] sm:text-2xl">{service.title}</h3>
                <p className="text-base leading-[1.55] text-muted-foreground md:order-none">{service.websiteFraming}</p>
                <span className="hidden md:block"><ArrowRight /></span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="project-proof-title" className="mx-auto grid max-w-public gap-10 px-5 pt-24 sm:px-12 sm:pt-32 lg:grid-cols-2 lg:items-end" data-home-section="project-proof" id="project-proof">
          <div>
            <h2 className={headingToken} id="project-proof-title">Proyek yang sudah dikerjakan.</h2>
            <p className="mt-3.5 max-w-[48ch] text-lead leading-[1.6] text-muted-foreground">Cerita, proses, dan batas bukti setiap proyek ada di halaman Proyek.</p>
            <NiuvaLink className="mt-7" href="/projects" variant="outline">Lihat semua proyek</NiuvaLink>
          </div>
          {listedProjects.length > 0 ? (
            <ul className="border-t border-border">
              {listedProjects.map((project) => (
                <li key={project.id}>
                  <Link href={`/projects/${project.slug}`} className="group flex items-baseline justify-between gap-4 border-b border-border py-4 text-lead font-medium hover:text-brand-800 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                    <span>{project.title}</span>
                    <span className="shrink-0 text-ui font-normal text-muted-foreground">{project.serviceLabel}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section aria-labelledby="next-step-title" className="relative mx-3 mt-24 overflow-hidden rounded-[var(--radius-media)] bg-[linear-gradient(140deg,var(--brand-700)_0%,var(--brand-800)_100%)] px-6 pt-11 pb-70 text-white sm:mx-6 sm:mt-32 sm:px-16 lg:h-110 lg:pb-0" data-home-section="next-step">
          <div className="relative z-10 lg:absolute lg:top-1/2 lg:left-16 lg:-translate-y-1/2">
            <h2 className={`${headingToken} max-w-[13em]`} id="next-step-title">Ceritakan kebutuhan proyek Anda.</h2>
            <B2BContactLink className="mt-7" variant="onBrand" />
          </div>
          <Image alt="" className="absolute -bottom-5 left-1/2 h-70 w-auto -translate-x-1/2 object-contain lg:right-[8%] lg:-bottom-7.5 lg:left-auto lg:h-[118%] lg:translate-x-0" height={1400} sizes="(max-width: 1024px) 70vw, 520px" src={mascot.victory} width={1400} />
        </section>
      </main>
    </PublicShell>
  );
}
