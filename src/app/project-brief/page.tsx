import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces, Space_Grotesk } from "next/font/google";

import { typographySystemTokens } from "@/app/auis/styleguide/foundation/typography-proof";
import { FormField } from "@/components/niuva";
import AuLogo from "@/components/ui/AuLogo";
import { AuLink } from "@/components/ui/AuLink";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";

const spaceGrotesk = Space_Grotesk({
  display: "swap",
  subsets: ["latin"],
  variable: "--font-public-sans",
  weight: "variable",
});

const fraunces = Fraunces({
  axes: ["opsz"],
  display: "swap",
  subsets: ["latin"],
  variable: "--font-public-editorial",
  weight: "variable",
});

const publicTypography = {
  "--font-auis-proof-sans": "var(--font-public-sans)",
  "--font-auis-proof-serif": "var(--font-public-editorial)",
  "--font-body": "var(--font-public-sans)",
  "--font-body-token": "var(--font-public-sans)",
  "--font-display": "var(--font-public-sans)",
  "--font-display-token": "var(--font-public-sans)",
  "--font-mono": "var(--font-public-sans)",
  "--font-sans": "var(--font-public-sans)",
  "--font-technical": "var(--font-public-sans)",
  "--font-technical-token": "var(--font-public-sans)",
  fontFamily: "var(--font-public-sans), Arial, Helvetica, sans-serif",
} as CSSProperties;

const displayToken = typographySystemTokens.display.className;
const headingToken = typographySystemTokens.heading.className;
const subheadingToken = typographySystemTokens.subheading.className;
const bodyToken = typographySystemTokens.body.className;
const editorialToken = typographySystemTokens["editorial-accent"];

const inputClassName = "h-11 bg-background text-base";
const textareaClassName =
  "min-h-32 w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-base leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const selectClassName =
  "h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const fileClassName =
  "block h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm leading-6 file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1 file:text-sm file:font-medium file:text-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export const metadata: Metadata = {
  title: "Project brief · Niuva",
  description:
    "Bawa konteks awal proyek kepada Niuva untuk ditinjau bersama.",
};

export default function ProjectBriefPage() {
  return (
    <div
      className={`${spaceGrotesk.variable} ${fraunces.variable} min-h-full bg-background text-foreground`}
      data-foundation-propagation="approved"
      data-foundation-scope="project-brief"
      data-product-screen-functional="proof-only"
      data-product-screen-proof-status="pending-owner-review"
      data-project-brief
      data-typography-version="1.0"
      style={publicTypography}
    >
      <a
        className="sr-only z-50 rounded-lg bg-background px-4 py-3 text-sm font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        href="#main-content"
      >
        Lewati ke konten utama
      </a>

      <header className="border-b border-border bg-card" data-project-section="header">
        <div className="mx-auto flex max-w-public items-center justify-between gap-5 px-5 py-4 sm:px-8">
          <Link
            aria-label="Niuva, kembali ke halaman utama"
            className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            href="/"
          >
            <AuLogo className="h-8 w-auto" priority />
          </Link>
          <AuLink className="gap-2" href="/" size="sm" variant="outline">
            <Icon aria-hidden="true" className="size-4 rotate-180" name="arrow-right" />
            Kembali ke Niuva
          </AuLink>
        </div>
      </header>

      <main id="main-content">
        <section
          aria-labelledby="project-brief-title"
          className="border-b border-border bg-background py-12 sm:py-16 lg:py-20"
          data-project-section="brief"
        >
          <div className="mx-auto grid max-w-public gap-12 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.78fr)_minmax(32rem,1.22fr)] lg:items-start lg:gap-16">
            <div className="lg:sticky lg:top-8">
              <p className="text-sm font-medium text-brand-700">Project brief</p>
              <h1 className={`${displayToken} mt-4 max-w-2xl`} id="project-brief-title">
                Buat langkah awal proyek jadi jelas.
              </h1>
              <p className={`${bodyToken} mt-6 text-muted-foreground`}>
                Ceritakan konteks, tujuan, dan tahap proyek agar Niuva dapat menentukan percakapan berikutnya.
              </p>
              <p
                className={`${editorialToken.className} mt-8 max-w-lg text-brand-900`}
                data-font-family="fraunces"
                data-type-role="editorial-accent"
                style={{
                  fontFamily: "var(--font-public-editorial), Georgia, serif",
                  fontOpticalSizing: "auto",
                  fontSynthesis: "none",
                }}
              >
                Keputusan yang baik dimulai dari konteks yang cukup.
              </p>

              <div className="mt-12 border-t border-border pt-5">
                <h2 className={`${headingToken} max-w-sm`}>
                  Yang perlu dibawa ke percakapan awal.
                </h2>
                <ul className="mt-6 divide-y divide-border border-y border-border">
                  <li className="grid gap-1 py-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-5">
                    <span className="text-sm font-semibold">Tujuan</span>
                    <span className="text-sm leading-6 text-muted-foreground">
                      Masalah atau peluang yang ingin Anda bawa lebih dekat ke bentuk.
                    </span>
                  </li>
                  <li className="grid gap-1 py-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-5">
                    <span className="text-sm font-semibold">Tahap</span>
                    <span className="text-sm leading-6 text-muted-foreground">
                      Ide, desain, prototype, atau produk yang sudah berjalan.
                    </span>
                  </li>
                  <li className="grid gap-1 py-4 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-5">
                    <span className="text-sm font-semibold">Batasan</span>
                    <span className="text-sm leading-6 text-muted-foreground">
                      Waktu, material, manufaktur, atau keputusan yang perlu dipertimbangkan.
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            <Card
              className="border-border shadow-floating"
              data-project-brief-form
            >
              <CardHeader className="border-b border-border pb-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-brand-700">Konteks proyek</p>
                    <CardTitle className={`${subheadingToken} mt-1`}>
                      Mulai dari informasi yang sudah tersedia.
                    </CardTitle>
                  </div>
                  <Badge variant="outline">Draft</Badge>
                </div>
                <CardDescription className="max-w-xl leading-6">
                  Field wajib membantu percakapan pertama tetap fokus. Detail dapat dilengkapi setelah konteks awal dipahami.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={
                      <Input
                        autoComplete="organization"
                        className={inputClassName}
                        name="organization"
                        placeholder="Nama perusahaan atau tim"
                      />
                    }
                    id="project-organization"
                    label="Perusahaan atau tim"
                    required
                  />
                  <FormField
                    control={
                      <Input
                        autoComplete="name"
                        className={inputClassName}
                        name="contactName"
                        placeholder="Nama yang dapat dihubungi"
                      />
                    }
                    id="project-contact-name"
                    label="Nama kontak"
                    required
                  />
                </div>

                <FormField
                  control={
                    <Input
                      autoComplete="email"
                      className={inputClassName}
                      name="email"
                      placeholder="nama@perusahaan.com"
                      type="email"
                    />
                  }
                  description="Gunakan alamat yang dapat menerima tindak lanjut dari Niuva."
                  id="project-email"
                  label="Email kerja"
                  required
                />

                <FormField
                  control={
                    <textarea
                      className={textareaClassName}
                      name="goal"
                      placeholder="Contoh: membuat prototype produk untuk ditinjau oleh tim engineering"
                      rows={5}
                    />
                  }
                  description="Ceritakan hasil yang ingin dicapai, bukan hanya bentuk akhirnya."
                  id="project-goal"
                  label="Apa yang ingin dicapai?"
                  required
                />

                <div className="grid gap-6 sm:grid-cols-2">
                  <FormField
                    control={
                      <select
                        className={selectClassName}
                        defaultValue=""
                        name="stage"
                      >
                        <option disabled value="">
                          Pilih tahap
                        </option>
                        <option value="idea">Ide</option>
                        <option value="design">Desain</option>
                        <option value="prototype">Prototype</option>
                        <option value="finished-product">Produk berjalan</option>
                      </select>
                    }
                    id="project-stage"
                    label="Tahap saat ini"
                    required
                  />
                  <FormField
                    control={
                      <select
                        className={selectClassName}
                        defaultValue=""
                        name="support"
                      >
                        <option disabled value="">
                          Pilih kebutuhan
                        </option>
                        <option value="research-development">Riset dan pengembangan</option>
                        <option value="consultation-workshop">Konsultasi dan workshop</option>
                        <option value="design-prototyping">Desain dan prototyping</option>
                        <option value="apparel-merchandise">Apparel dan merchandise</option>
                      </select>
                    }
                    id="project-support"
                    label="Dukungan yang dicari"
                    required
                  />
                </div>

                <FormField
                  control={
                    <input
                      accept=".pdf,.png,.jpg,.jpeg,.stl,.3mf,.obj"
                      className={fileClassName}
                      name="reference"
                      type="file"
                    />
                  }
                  description="Opsional. Batas ukuran dan kebijakan penyimpanan dikonfirmasi pada tahap implementasi."
                  id="project-reference"
                  label="Lampiran referensi"
                />

                <div className="flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-start sm:justify-between">
                  <Button className="w-full sm:w-auto" size="lg" type="button">
                    Kirim brief untuk ditinjau
                    <Icon aria-hidden="true" className="size-4" name="arrow-up-right" />
                  </Button>
                  <p
                    className="max-w-sm text-xs leading-5 text-muted-foreground sm:text-right"
                    id="project-brief-proof-note"
                  >
                    Tampilan ini adalah proof propagation. Pengiriman server, reference ID, dan tindak lanjut WhatsApp masuk ke implementasi alur B2B berikutnya.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section
          aria-labelledby="next-review-title"
          className="bg-card py-12 sm:py-16"
          data-project-section="next-review"
        >
          <div className="mx-auto grid max-w-public gap-8 px-5 sm:px-8 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:gap-16">
            <div>
              <p className="text-sm font-medium text-brand-700">Setelah konteks diterima</p>
              <h2 className={`${headingToken} mt-3 max-w-md`} id="next-review-title">
                Percakapan berlanjut dari informasi yang sama.
              </h2>
            </div>
            <ol className="divide-y divide-border border-y border-border">
              <li className="grid gap-2 py-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
                <span className="font-semibold">Review awal</span>
                <span className="text-sm leading-6 text-muted-foreground">
                  Niuva membaca tujuan, tahap, dan batasan untuk memahami kebutuhan yang sebenarnya.
                </span>
              </li>
              <li className="grid gap-2 py-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
                <span className="font-semibold">Arah pembicaraan</span>
                <span className="text-sm leading-6 text-muted-foreground">
                  Percakapan berikutnya diarahkan ke riset, desain, prototype, atau dukungan manufaktur yang relevan.
                </span>
              </li>
              <li className="grid gap-2 py-5 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6">
                <span className="font-semibold">Langkah berikutnya</span>
                <span className="text-sm leading-6 text-muted-foreground">
                  Detail komersial dan tindak lanjut dibahas setelah konteks proyek cukup jelas untuk ditinjau.
                </span>
              </li>
            </ol>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-background" data-project-section="footer">
        <div className="mx-auto flex max-w-public flex-col gap-4 px-5 py-8 sm:flex-row sm:items-end sm:justify-between sm:px-8">
          <div className="space-y-3">
            <Link
              aria-label="Niuva, kembali ke halaman utama"
              className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              href="/"
            >
              <AuLogo className="h-7 w-auto" />
            </Link>
            <p className="max-w-sm text-sm leading-6 text-muted-foreground">
              Bawa konteks yang sudah ada. Niuva membantu menentukan bentuk berikutnya.
            </p>
          </div>
          <p className="text-xs text-muted-foreground">Niuva Inovasi Utama</p>
        </div>
      </footer>
    </div>
  );
}
