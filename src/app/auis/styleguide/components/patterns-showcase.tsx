import type { ReactNode } from "react";

import {
  ActionQueueItem,
  EvidenceCard,
  MoneySummary,
  StatusNotice,
  VariantSelector,
} from "@/components/niuva";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Icon } from "@/components/ui/Icon";

const patternLines = [
  { label: "Prototype display", value: "Rp 1.250.000", detail: "1 unit" },
  { label: "Pengiriman", value: "Rp 85.000", detail: "Alamat fixture" },
  { label: "Biaya layanan", value: "Rp 12.500" },
] as const;

function PatternFrame({
  boundary,
  children,
  description,
  id,
  title,
}: Readonly<{
  boundary: string;
  children: ReactNode;
  description: string;
  id: string;
  title: string;
}>) {
  return (
    <article
      className="space-y-4 rounded-xl border border-border bg-muted/30 p-4 sm:p-5"
      data-pattern={id}
      data-pattern-scope="styleguide-only"
      data-pattern-status="approved"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        <Badge variant="secondary">Approved · styleguide-only</Badge>
      </div>
      {children}
      <p className="border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
        <span className="font-medium text-foreground">Boundary:</span> {boundary}
      </p>
    </article>
  );
}

export function PatternsShowcase() {
  return (
    <section
      className="scroll-mt-8 space-y-6"
      data-pattern-showcase
      data-pattern-showcase-scope="styleguide-only"
      data-pattern-showcase-status="approved-styleguide-only"
      data-pattern-showcase-visual-review="approved"
      id="patterns"
    >
      <div className="space-y-3">
        <p className="text-sm font-medium text-brand-700">Design System · pattern proof</p>
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-semibold tracking-tight">Patterns yang lahir dari flow nyata</h2>
          <Badge>4 approved proofs</Badge>
          <Badge variant="outline">No new tokens</Badge>
        </div>
        <p className="max-w-3xl leading-7 text-muted-foreground">
          Pattern adalah susunan route-level yang menghubungkan komponen official
          dengan konteks Niuva. Fixture ini memakai project evidence, retail,
          checkout, dan keputusan operator; tidak ada pricing, stock, upload,
          payment, atau transition authority di dalamnya.
        </p>
      </div>

      <div className="space-y-5" data-pattern-registry="proofs">
        <PatternFrame
          boundary="Tetap route-owned sampai pola case-study berulang dan content evidence sudah tersedia."
          description="Narasi dimulai dari kebutuhan dan bukti proses, lalu mengarah ke satu tindakan yang jelas."
          id="hero-case-study"
          title="Hero / case-study opener"
        >
          <div className="grid gap-4 rounded-xl border border-neutral-700 bg-neutral-900 p-4 text-neutral-50 lg:grid-cols-[1.05fr_0.95fr] lg:p-5">
            <div className="flex min-w-0 flex-col justify-between gap-6">
              <div className="space-y-3">
                <p className="text-xs font-medium text-brand-300">Project evidence · tangible outcome</p>
                <h4 className="max-w-xl text-2xl font-semibold tracking-tight sm:text-3xl">Dari kebutuhan yang jelas menuju bentuk yang bisa diuji.</h4>
                <p className="max-w-xl text-sm leading-6 text-neutral-300">Niuva membantu tim bergerak dari riset dan engineering menuju prototype yang dapat ditinjau bersama.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button">Diskusikan proyek</Button>
                <Button
                  className="border-neutral-600 bg-transparent text-neutral-50 hover:bg-neutral-800 hover:text-neutral-50"
                  type="button"
                  variant="outline"
                >
                  Lihat proses
                </Button>
              </div>
            </div>
            <EvidenceCard
              description="Ringkasan project yang menghubungkan kebutuhan, proses, dan hasil yang dapat dibuktikan."
              eyebrow="Project · proof"
              meta={["Riset", "Engineering", "Prototype"]}
              title="Perangkat yang lahir dari proses terukur"
              variant="project"
            />
          </div>
        </PatternFrame>

        <PatternFrame
          boundary="Availability dan price datang dari server; pattern hanya mengatur perbandingan dan pilihan."
          description="Discovery memberi cukup konteks untuk membandingkan item tanpa mengubah katalog menjadi dekorasi."
          id="product-discovery"
          title="Product discovery"
        >
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-4 sm:grid-cols-2">
              <EvidenceCard
                description="Fixture retail dengan material dan ukuran yang dapat dibandingkan."
                eyebrow="Ready-made · display"
                meta={["ABS", "120 mm"]}
                title="Prototype display"
                variant="capability"
              />
              <EvidenceCard
                description="Pilihan yang menampilkan trade-off finishing tanpa klaim yang tidak bersumber."
                eyebrow="Ready-made · finish"
                meta={["Matte", "Small batch"]}
                title="Aksesori yang siap diuji"
                variant="process"
              />
            </div>
            <Card>
              <CardHeader>
                <h4 className="font-semibold">Bandingkan finishing</h4>
                <p className="text-sm text-muted-foreground">Pilihan mengikuti ketersediaan dari server.</p>
              </CardHeader>
              <CardContent>
                <VariantSelector
                  defaultSelectedId="blue"
                  label="Finishing"
                  name="pattern-product-finish"
                  options={[
                    { id: "blue", label: "Niuva Blue", detail: "Matte · 120 mm", price: "Rp 1.250.000", swatchTone: "brand" },
                    { id: "natural", label: "Natural ABS", detail: "Matte · 120 mm", price: "Rp 1.180.000", swatchTone: "neutral" },
                  ]}
                  variant="swatch"
                />
              </CardContent>
            </Card>
          </div>
        </PatternFrame>

        <PatternFrame
          boundary="Summary menampilkan nilai authoritative dan recovery; pattern tidak menghitung total atau mengotorisasi payment."
          description="Checkout menjaga perhatian pada total, sumber nilai, dan langkah aman berikutnya."
          id="checkout-summary"
          title="Checkout Summary"
        >
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <MoneySummary
              description="Rincian dari server untuk ready-made checkout fixture."
              lines={patternLines}
              note="Server checkout · snapshot fixture"
              title="Ready-made checkout"
              total="Rp 1.347.500"
              currency="IDR"
              variant="checkout"
            />
            <StatusNotice
              actionLabel="Periksa alamat"
              description="Pastikan alamat dan pilihan pengiriman benar sebelum workflow diteruskan."
              title="Satu langkah aman sebelum pembayaran"
              tone="info"
            />
          </div>
        </PatternFrame>

        <PatternFrame
          boundary="Prioritas dan status tetap domain-owned; pattern hanya menyajikan konteks serta next safe action."
          description="Admin queue mengelompokkan pekerjaan berdasarkan keputusan operator, bukan menampilkan tabel mentah."
          id="admin-action-queue"
          title="Admin Action Queue"
        >
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-medium text-brand-700">Operations · next decision</p>
                  <h4 className="mt-1 font-semibold">Pekerjaan yang membutuhkan konteks</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button aria-pressed="true" size="sm" type="button" variant="secondary">Semua</Button>
                  <Button size="sm" type="button" variant="outline">Menunggu</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              <ActionQueueItem
                kind="custom-review"
                primaryAction={<Button size="sm" type="button">Mulai review</Button>}
                reference="DEMO-025"
                status="waiting"
                summary="File custom menunggu verifikasi operator"
                updatedAt="12 menit lalu"
              />
              <ActionQueueItem
                kind="package"
                primaryAction={<Button size="sm" type="button" variant="destructive">Periksa kendala</Button>}
                reference="DEMO-023"
                status="blocked"
                summary="Pengukuran paket belum tersedia"
                updatedAt="1 jam lalu"
              />
            </CardContent>
          </Card>
        </PatternFrame>
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
        <Icon aria-hidden="true" className="size-4 text-success" name="check-circle-2" />
        <span>Pattern proof disetujui untuk styleguide-only; product route tetap menunggu task terpisah.</span>
      </div>
    </section>
  );
}
