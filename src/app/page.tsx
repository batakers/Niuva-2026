import Link from "next/link";
import type { Metadata } from "next";
import { PublicShell } from "@/components/niuva/public-shell";
import { B2BContactLink } from "@/components/niuva/b2b-contact-link";
import { ClosingPanel } from "@/components/niuva/closing-panel";
import { typographySystemTokens } from "@/design/typography";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Icon } from "@/components/ui/Icon";
import { getProjectPreview } from "@/features/frontend-preview/server";
import { publicCompanyProfile, publicServices } from "@/features/public/company-content";
import { mascotRenders } from "@/features/public/mascot";
import { ProjectTitle } from "@/features/public/project-title-view";
import { buildPageSocialMetadata } from "@/lib/site-metadata";
import { getPublicSiteInformation } from "@/modules/site-information/public-reader";
import { DriftCard, HeroStageWord, LeaningMascot, ProcessScene, type ProcessStage } from "./home-motion";
import { StartingPoints, type StartingPath } from "./home-starting-points";

const headingToken = typographySystemTokens.heading.className;

// The approved headline ends with "prototipe."; the visual word cycles through the
// promise (Owner Q23, 31 Oct 2026) while the heading keeps the approved text for AT.
const headlineLead = "Mitra pengembangan produk dari riset hingga";
const stageWords = ["prototipe", "desain", "produk nyata"] as const;

const mascot = mascotRenders;

const processStages: readonly ProcessStage[] = [
  { title: "Ide", description: "Tujuan, konteks pengguna, dan batasan awal dipetakan bersama.", image: mascot.idea, alt: "Maskot Niuva tersenyum menunjuk ke atas, ke bohlam menyala dan tanda tanya di atas kepala" },
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
const bubble = "absolute max-w-64 rounded-xl bg-card p-3.5 text-caption leading-[1.45] shadow-floating";

const startingPaths: readonly StartingPath[] = [
  {
    id: "idea",
    label: "Ide atau proyek",
    title: "Punya ide atau proyek?",
    description: "Ceritakan tujuan, tahap saat ini, dan bahan awal Anda. Tim Niuva membahas kebutuhan, ruang lingkup, dan langkah berikutnya langsung lewat WhatsApp.",
    action: <B2BContactLink />,
    image: mascot.collaborate,
    alt: "Maskot Niuva menunjuk ke depan",
    notes: (
      <>
        <p className={`${bubble} top-6 left-6`}>Contoh: “Kami butuh prototipe casing untuk perangkat baru.”</p>
        <p className={`${bubble} right-6 bottom-8`}>Niuva: “Bisa. Kirim sketsa atau CAD-nya, kita bahas ruang lingkupnya dulu.”</p>
      </>
    ),
  },
  {
    id: "model",
    label: "Model 3D",
    title: "Sudah punya model 3D?",
    description: "Unggah STL, 3MF, atau OBJ secara privat. Operator memeriksa model dan hasil slicing sebelum quote dikirim, jadi Anda menyetujui harga yang sudah diverifikasi.",
    action: <NiuvaLink href="/custom-print" variant="outline">Ajukan untuk Review</NiuvaLink>,
    image: mascot.design,
    alt: "Maskot Niuva memegang laptop",
    notes: (
      <>
        <div className="absolute top-6 left-6 min-w-60 rounded-xl bg-card p-3.5 text-caption shadow-floating">
          <div className="flex items-center gap-2.5"><span><b className="font-semibold">casing-v2.stl</b> <span className="text-muted-foreground">(contoh)</span></span><span className="ml-auto rounded-full bg-warning-background px-2.5 py-0.5 text-xs font-bold whitespace-nowrap text-warning">Perlu review</span></div>
        </div>
        <p className={`${bubble} right-6 bottom-8`}>Estimasi awal, bukan harga final.</p>
      </>
    ),
  },
  {
    id: "shop",
    label: "Produk siap pakai",
    title: "Cari produk siap pakai?",
    description: "Pilih produk ready-made dan variannya di Toko. Harga, stok, dan ongkir diperiksa ulang saat checkout.",
    action: <NiuvaLink href="/shop" variant="outline">Lihat Toko</NiuvaLink>,
    image: mascot.present,
    alt: "Maskot Niuva memegang tablet",
    notes: <p className={`${bubble} top-6 left-6`}>Varian, harga, dan stok tampil di setiap produk sebelum Anda menambah ke keranjang.</p>,
  },
];

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
          className="relative mx-3 overflow-hidden rounded-[var(--radius-media)] bg-[radial-gradient(130%_70%_at_50%_100%,var(--brand-400)_0%,var(--brand-600)_32%,var(--brand-700)_62%,var(--brand-800)_100%)] lg:bg-[radial-gradient(70%_110%_at_80%_35%,var(--brand-400)_0%,var(--brand-600)_30%,var(--brand-700)_58%,var(--brand-800)_100%)] xl:bg-[radial-gradient(52%_105%_at_83%_38%,var(--brand-400)_0%,var(--brand-600)_30%,var(--brand-700)_58%,var(--brand-800)_100%)] text-white sm:mx-6 lg:h-155"
          data-home-section="hero"
          id="hero"
        >
          {/* From xl the column holds "Mitra pengembangan produk / dari riset hingga produk nyata." on two lines. */}
          <div className="relative z-10 px-6 pt-10 sm:px-(--panel-inset) lg:absolute lg:inset-y-0 lg:left-0 lg:flex lg:w-[calc(var(--panel-inset)+30rem)] lg:flex-col lg:justify-center lg:pr-0 lg:pt-0 xl:w-[calc(var(--panel-inset)+49rem)]">
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
          <div className="relative h-64 lg:absolute lg:inset-y-0 lg:right-0 lg:left-[calc(var(--panel-inset)+30rem)] lg:h-auto xl:left-[calc(var(--panel-inset)+49rem)]">
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
            <DriftCard className="absolute bottom-18 left-[-12%] z-20 hidden lg:block" depth={-0.35}>
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

          <StartingPoints paths={startingPaths} />
        </section>

        <section aria-labelledby="process-title" className="mx-3 mt-24 rounded-[var(--radius-media)] border border-border bg-card sm:mx-6 sm:mt-32" data-home-section="process">
          <ProcessScene
            heading={<h2 className={headingToken} id="process-title">Dari ide menjadi produk nyata.</h2>}
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
                  {/* Phones stack the service under the title; longer service names must not push the row wide. */}
                  <Link href={`/projects/${project.slug}`} className="group flex flex-col gap-1 border-b border-border py-4 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                    <span className="min-w-0 text-lead font-medium"><ProjectTitle qualifierClassName="mt-0.5 text-ui font-normal" title={project.title} /></span>
                    <span className="text-ui text-muted-foreground sm:max-w-[45%] sm:shrink-0 sm:text-right">{project.serviceLabel}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <ClosingPanel homeSection="next-step" id="next-step-title" mascot={mascot.victory} title="Ceritakan kebutuhan proyek Anda.">
          <B2BContactLink className="mt-7" variant="onBrand" />
        </ClosingPanel>
      </main>
    </PublicShell>
  );
}
