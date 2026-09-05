import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  formatResponsiveSpec,
  formatResponsiveTracking,
  frauncesAxisPolicy,
  frauncesSystemStyle,
  technicalTypographyPolicy,
  typographyCoreRoleOrder,
  typographySystemMeta,
  typographySystemTokens,
  typographyScalePolicy,
  typographyViewportSteps,
  typographyWeightPolicy,
} from "../foundation/typography-proof";

const displayToken = typographySystemTokens.display;
const headingToken = typographySystemTokens.heading;
const subheadingToken = typographySystemTokens.subheading;
const bodyToken = typographySystemTokens.body;
const editorialAccentToken = typographySystemTokens["editorial-accent"];

const responsivePreviewRoles = [
  "display",
  "heading",
  "editorial-accent",
] as const;

const processSteps = [
  ["01", "Brief", "Tujuan, batas, dan ukuran"],
  ["02", "Prototype", "Bentuk, material, dan fit"],
  ["03", "Review", "Keputusan tetap pada manusia"],
] as const;

const operatorRows = [
  ["NIUVA-026", "Custom print", "Perlu review", "12 mnt"],
  ["NIUVA-025", "Ready-made", "Siap diproses", "28 mnt"],
  ["NIUVA-024", "Project brief", "Brief baru", "1 jam"],
] as const;

export function TypographyProof() {
  return (
    <section
      className="scroll-mt-8 space-y-7"
      data-proof-scope="styleguide-only"
      data-typography-proof
      data-typography-status={typographySystemMeta.status}
      data-typography-version={typographySystemMeta.version}
      id="typography"
    >
      <header className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="space-y-2">
          <p className="text-sm font-medium text-brand-700">
            Comp-first typography proof
          </p>
          <h2 className={`${headingToken.className} max-w-4xl`}>
            Space Grotesk memegang sistem. Fraunces memberi jeda manusia.
          </h2>
          <p className={`${bodyToken.className} text-muted-foreground`}>
            Typography System v1.0 sudah disetujui. Scale, responsive steps,
            weight, tracking, line-height, dan axis Fraunces kini menjadi
            kontrak foundation; penerapannya tetap dibatasi pada styleguide.
          </p>
        </div>
        <Badge className="justify-self-start" variant="outline">
          APPROVED v1.0 · no propagation
        </Badge>
      </header>

      <article
        aria-labelledby="typography-homepage-title"
        className="dark overflow-hidden rounded-2xl border border-neutral-700 bg-neutral-950 text-neutral-50 shadow-card"
        data-proof-context="homepage"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-700 px-5 py-3 text-xs text-neutral-300 sm:px-7">
          <span>Homepage · bukaan pertama</span>
          <span className="tabular-nums">Proof 01 / 04</span>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)]">
          <div className="flex min-h-[30rem] flex-col justify-between gap-12 px-5 py-9 sm:px-7 sm:py-12 lg:px-10 lg:py-14">
            <div className="max-w-3xl space-y-6">
              <p className="text-sm font-medium text-brand-300">
                Produk, prototype, dan sistem yang bisa diperiksa
              </p>
              <h3
                className={displayToken.className}
                data-font-family="space-grotesk"
                data-type-role="display"
                id="typography-homepage-title"
              >
                Membawa gagasan dari sketsa ke benda yang bisa diuji.
              </h3>
              <blockquote
                className={`${editorialAccentToken.className} max-w-2xl text-brand-100`}
                data-axis-opsz="auto"
                data-font-family="fraunces"
                data-type-role="editorial-accent"
                style={frauncesSystemStyle}
              >
                Yang membuat ide terasa nyata adalah bukti bahwa ia dapat
                diwujudkan.
              </blockquote>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="lg" type="button">
                Ajukan brief proyek
              </Button>
              <Button size="lg" type="button" variant="outline">
                Lihat cara kami bekerja
              </Button>
            </div>
          </div>

          <aside className="border-t border-neutral-700 bg-neutral-50 p-5 text-neutral-950 sm:p-7 lg:border-t-0 lg:border-l">
            <div className="flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-brand-700">
                    Jejak bukti
                  </p>
                  <p className="mt-1 text-lg font-semibold">
                    Bukan dekorasi. Ini alur kerja.
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-neutral-500">
                  03 tahap
                </span>
              </div>

              <ol className="mt-10 divide-y divide-neutral-200 border-y border-neutral-200">
                {processSteps.map(([index, title, description]) => (
                  <li className="grid grid-cols-[2rem_minmax(0,1fr)] gap-4 py-5" key={index}>
                    <span className="text-sm font-semibold tabular-nums text-brand-700">
                      {index}
                    </span>
                    <div>
                      <p className="font-semibold">{title}</p>
                      <p className="mt-1 text-sm leading-6 text-neutral-600">
                        {description}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              <p className="mt-auto pt-8 text-xs leading-5 text-neutral-500">
                Space Grotesk menangani navigasi, data, body, dan action. Tidak
                ada display serif pada control.
              </p>
            </div>
          </aside>
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]">
        <article
          aria-labelledby="typography-case-study-title"
          className="rounded-2xl border border-brand-200 bg-brand-50 p-5 shadow-card sm:p-7"
          data-proof-context="case-study"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-brand-900/70">
            <span>Case study · pembuka</span>
            <span className="tabular-nums">Proof 02 / 04</span>
          </div>
          <div className="mt-10 max-w-3xl">
            <p className="text-sm font-medium text-brand-800">
              Dari kebutuhan ke keputusan
            </p>
            <h3
              className={`${headingToken.className} mt-3 text-neutral-950`}
              data-font-family="space-grotesk"
              data-type-role="heading"
              id="typography-case-study-title"
            >
              Prototype mengubah percakapan abstrak menjadi sesuatu yang dapat
              dibandingkan.
            </h3>
            <blockquote
              className={`${editorialAccentToken.className} mt-9 border-l-2 border-brand-700 pl-5 text-brand-950`}
              data-axis-opsz="auto"
              data-font-family="fraunces"
              data-type-role="editorial-accent"
              style={frauncesSystemStyle}
            >
              “Bukan sekadar terlihat selesai—setiap perubahan harus punya
              alasan yang dapat ditunjukkan.”
            </blockquote>
            <p className="mt-4 pl-5 text-sm leading-6 text-brand-900/70">
              Contoh voice untuk temuan atau refleksi proyek; bukan pola
              highlight di setiap headline.
            </p>
          </div>
        </article>

        <article
          aria-labelledby="typography-checkout-title"
          className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7"
          data-proof-context="checkout"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>Produk + checkout</span>
            <span className="tabular-nums">Proof 03 / 04</span>
          </div>

          <div className="mt-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-brand-700">Ready-made</p>
              <h3
                className={`${subheadingToken.className} mt-1`}
                data-font-family="space-grotesk"
                data-type-role="subheading"
                id="typography-checkout-title"
              >
                Desk Organizer — Blue
              </h3>
            </div>
            <Badge variant="secondary">Tersedia</Badge>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 border-y border-border py-5 text-sm">
            <div>
              <p className="text-muted-foreground">Warna</p>
              <p className="mt-1 font-medium">Niuva blue</p>
            </div>
            <div>
              <p className="text-muted-foreground">Jumlah</p>
              <p className="mt-1 font-medium tabular-nums">01</p>
            </div>
          </div>

          <div className="mt-auto pt-8">
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-sm text-muted-foreground">Total sementara</p>
              <p className="text-xl font-semibold tabular-nums">Rp 480.000</p>
            </div>
            <Button className="mt-4 w-full" size="lg" type="button">
              Lanjutkan pesanan
            </Button>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              Commerce tetap sans-only agar harga, status, dan tindakan dapat
              dipindai tanpa perubahan suara.
            </p>
          </div>
        </article>
      </div>

      <article
        aria-labelledby="typography-dashboard-title"
        className="overflow-hidden rounded-2xl border border-neutral-300 bg-neutral-100 shadow-card"
        data-proof-context="dashboard"
      >
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-neutral-300 bg-neutral-50 px-5 py-5 sm:px-7">
          <div>
            <p className="text-xs font-medium text-brand-700">
              Admin · kepadatan operasional
            </p>
            <h3
              className={`${subheadingToken.className} mt-1`}
              data-font-family="space-grotesk"
              data-type-role="subheading"
              id="typography-dashboard-title"
            >
              Antrian yang perlu keputusan
            </h3>
          </div>
          <div className="text-right">
            <p className="text-xs text-neutral-500">Data simulasi proof</p>
            <p className="mt-1 text-sm font-semibold tabular-nums">3 item aktif</p>
          </div>
        </div>

        <div className="divide-y divide-neutral-300">
          {operatorRows.map(([reference, request, status, age]) => (
            <div
              className="grid gap-3 bg-card px-5 py-4 text-sm sm:grid-cols-[8rem_minmax(0,1fr)_9rem_5rem] sm:items-center sm:px-7"
              key={reference}
            >
              <p className="font-semibold tabular-nums">{reference}</p>
              <p>{request}</p>
              <p className="font-medium text-brand-800">{status}</p>
              <p className="text-neutral-500 tabular-nums sm:text-right">{age}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-300 px-5 py-4 text-xs text-neutral-600 sm:px-7">
          <span>Space Grotesk Medium menggantikan kebutuhan font mono.</span>
          <span className="tabular-nums">Proof 04 / 04</span>
        </div>
      </article>

      <div
        className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7"
        data-responsive-steps
        id="typography-responsive"
      >
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-brand-700">Responsive contract</p>
          <h3 className={`${subheadingToken.className} mt-1`}>
            Tiga step yang bisa diprediksi, bukan ukuran baru di setiap breakpoint.
          </h3>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Body dan UI tidak mengecil. Hanya hierarchy besar yang naik ketika
            ruang baca benar-benar tersedia.
          </p>
        </div>

        <div className="mt-7 grid gap-3 md:grid-cols-3">
          {typographyViewportSteps.map((step) => (
            <article
              className="rounded-xl border border-border bg-background p-4"
              data-responsive-step={step.id}
              key={step.id}
            >
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-semibold">{step.label}</p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {step.range}
                </p>
              </div>
              <p className="mt-2 min-h-12 text-xs leading-5 text-muted-foreground">
                {step.description}
              </p>
              <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                {responsivePreviewRoles.map((role) => {
                  const token = typographySystemTokens[role];

                  return (
                    <div className="flex items-center justify-between gap-3" key={role}>
                      <dt>{token.label}</dt>
                      <dd className="font-medium tabular-nums">
                        {token.size[step.id]} / {token.lineHeight[step.id]}
                      </dd>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between gap-3">
                  <dt>Body</dt>
                  <dd className="font-medium tabular-nums">16px / 24px</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div
          className="rounded-2xl border border-border bg-card p-5 shadow-card sm:p-7"
          data-type-scale
          id="typography-scale"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-brand-700">Typography System v1.0</p>
              <h3 className={`${subheadingToken.className} mt-1`}>
                Lima core roles, satu accent yang dibatasi
              </h3>
            </div>
            <span className="text-xs text-muted-foreground">
              Compact → standard → wide
            </span>
          </div>

          <div className="mt-7 divide-y divide-border border-y border-border">
            {typographyCoreRoleOrder.map((role) => {
              const token = typographySystemTokens[role];

              return (
                <div
                  className="grid gap-4 py-6 md:grid-cols-[10rem_minmax(0,1fr)]"
                  key={role}
                >
                  <div>
                    <p className="text-sm font-semibold">{token.label}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {token.family}
                      <br />
                      <span className="tabular-nums">
                        {formatResponsiveSpec(token)} · {token.weight}
                      </span>
                      <br />
                      Tracking {formatResponsiveTracking(token)}
                    </p>
                  </div>
                  <div>
                    <p
                      className={token.className}
                      data-font-family="space-grotesk"
                      data-type-role={role}
                    >
                      {token.sample}
                    </p>
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {token.usage}
                    </p>
                  </div>
                </div>
              );
            })}
            <div className="grid gap-4 py-6 md:grid-cols-[10rem_minmax(0,1fr)]">
              <div>
                <p className="text-sm font-semibold">{editorialAccentToken.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {editorialAccentToken.family}
                  <br />
                  <span className="tabular-nums">
                    {formatResponsiveSpec(editorialAccentToken)} · {editorialAccentToken.weight}
                  </span>
                  <br />
                  Tracking {formatResponsiveTracking(editorialAccentToken)}
                </p>
              </div>
              <div>
                <p
                  className={editorialAccentToken.className}
                  data-axis-opsz="auto"
                  data-font-family="fraunces"
                  data-type-role="editorial-accent"
                  style={frauncesSystemStyle}
                >
                  {editorialAccentToken.sample}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {editorialAccentToken.usage}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <aside
            className="rounded-2xl border border-border bg-neutral-950 p-5 text-neutral-50 shadow-card sm:p-6"
            data-fraunces-axis-policy
          >
            <p className="text-sm font-semibold text-brand-300">Fraunces control</p>
            <h3 className="mt-2 text-xl font-semibold">Expressive, tetapi restrained.</h3>
            <dl className="mt-6 divide-y divide-neutral-700 border-y border-neutral-700 text-sm">
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-neutral-400">Axis dimuat</dt>
                <dd className="font-medium">{frauncesAxisPolicy.loadedAxes.join(", ")}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-neutral-400">Optical sizing</dt>
                <dd className="font-medium">{frauncesAxisPolicy.opticalSizing}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-neutral-400">Weight</dt>
                <dd className="font-medium tabular-nums">{frauncesAxisPolicy.weight}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-neutral-400">Style</dt>
                <dd className="font-medium">{frauncesAxisPolicy.style}</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-neutral-400">SOFT / WONK</dt>
                <dd className="text-right font-medium">default · tidak dimuat</dd>
              </div>
              <div className="flex justify-between gap-4 py-3">
                <dt className="text-neutral-400">Italic</dt>
                <dd className="font-medium">{frauncesAxisPolicy.italic}</dd>
              </div>
            </dl>
          </aside>

          <aside className="rounded-2xl border border-brand-200 bg-brand-50 p-5 shadow-card sm:p-6">
            <p className="text-sm font-semibold text-brand-800">Weight + tracking</p>
            <div className="mt-5 space-y-4 text-sm leading-6 text-brand-950">
              <p>
                Scale memakai anchor <strong>{typographyScalePolicy.base}</strong> dan rasio
                {" "}<strong className="tabular-nums">{typographyScalePolicy.ratio}</strong>, lalu
                {" "}{typographyScalePolicy.rounding} agar tetap praktis di UI.
              </p>
              <p>
                Core weight: <strong className="tabular-nums">{typographyWeightPolicy.core.join(" / ")}</strong>.
                Weight {typographyWeightPolicy.strongByException} hanya untuk emphasis khusus;
                300 tidak masuk sistem.
              </p>
              <p>
                Technical exception: <strong>{technicalTypographyPolicy.size} / {technicalTypographyPolicy.lineHeight} / {technicalTypographyPolicy.weight}</strong>,
                tracking {technicalTypographyPolicy.tracking}; {technicalTypographyPolicy.casing}.
              </p>
              <p>
                Harga, ID, timestamp, dan status tetap sentence case dengan
                tabular numerals—bukan mono dan bukan uppercase massal.
              </p>
            </div>
          </aside>
        </div>
      </div>

      <div
        className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-brand-300 bg-brand-50 px-5 py-4"
        data-typography-approval="approved-no-propagation"
        role="status"
      >
        <div>
          <p className="font-semibold text-brand-950">Typography System v1.0 disetujui owner.</p>
          <p className="mt-1 text-sm text-brand-900/75">
            Kontrak terkunci di foundation/styleguide; global tokens dan product screens belum dipropagasi.
          </p>
        </div>
        <Badge variant="outline">Approved · propagation paused</Badge>
      </div>
    </section>
  );
}
