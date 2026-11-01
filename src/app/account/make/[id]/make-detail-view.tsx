import { StatusNotice } from "@/components/niuva/status-notice";
import { Icon } from "@/components/ui/Icon";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { typographySystemTokens as type } from "@/design/typography";
import type { CustomPrintIntakeMode, CustomPrintQuoteStatus, CustomPrintRequestStatus } from "@/generated/prisma/client";
import {
  customRequestStatusDescription,
  customRequestStatusLabel,
  filamentSourceLabel,
  quoteStatusLabel,
} from "@/features/customer-status/labels";
import { formatGrams, formatPrintDuration, formatRupiah } from "@/modules/shared/format";
import { AppendModelForm } from "@/app/custom-print/requests/[token]/append-model-form";

import { QuoteDecision } from "./quote-decision";
import { RoughShippingForm } from "./rough-shipping-form";

type Cost = Readonly<{ amountRp: string; name: string }>;

export type AccountMakeDetail = Readonly<{
  canAppend: boolean;
  estimate: Readonly<{
    components: Readonly<{
      additionalCosts: readonly Cost[];
      filamentSource: string;
      machineRp: string;
      material: string;
      materialRp: string;
      printDurationSeconds: number;
      quantity: number;
      weightGrams: string;
    }> | null;
    lowerRp: string;
    upperRp: string;
    version: number;
  }> | null;
  fileExtensions: readonly string[];
  id: string;
  intakeMode: CustomPrintIntakeMode;
  modelReady: boolean;
  preview: Readonly<{
    printDurationSecondsPerUnit: number;
    quantity: number;
    totalRp: string;
    weightGramsPerUnit: string;
  }> | null;
  quotes: readonly Readonly<{
    /** Itemised costs from the quote snapshot; null when only the subtotal is known. */
    additionalCosts: readonly Cost[] | null;
    additionalSubtotalRp: string;
    decidable: boolean;
    expiresAt: Date | null;
    finalTotalRp: string;
    id: string;
    /** Only the latest quote can take a decision. */
    latest: boolean;
    machineRp: string;
    materialRp: string;
    quoteNumber: string;
    status: CustomPrintQuoteStatus;
    version: number;
  }>[];
  referenceNumber: string;
  roughShippingAvailable: boolean;
  status: CustomPrintRequestStatus;
  uploadsEnabled: boolean;
}>;

const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });

const cardClass = "rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-6";
const sectionTitleClass = "text-2xl font-medium tracking-[-0.015em]";

function CostRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-ui font-normal text-muted-foreground">{label}</dt>
      <dd className="text-right text-ui font-medium tabular-nums">{value}</dd>
    </div>
  );
}

export function MakeDetailView({ request }: Readonly<{ request: AccountMakeDetail }>) {
  const facts = [
    ["Nomor referensi", request.referenceNumber],
    ["Titik mulai", request.intakeMode === "REFERENCE_ONLY" ? "Referensi awal" : "Model 3D/CAD"],
    ["Model terverifikasi", request.modelReady ? "Sudah tersedia" : "Belum tersedia"],
    ["File diterima", request.fileExtensions.length === 0 ? "Belum ada" : request.fileExtensions.join(" · ")],
  ] as const;
  const estimate = request.estimate;
  // A sent quote is the price that counts, so it leads; the estimate and simulation follow as history.
  const quoteSection = (
    <section aria-labelledby="make-quote-title">
      <h2 className={sectionTitleClass} id="make-quote-title">Quote</h2>
      {request.quotes.length === 0 ? (
        <p className="mt-3 text-ui font-normal leading-[1.55] text-muted-foreground">Quote belum dikirim. Operator mengirim quote setelah review selesai.</p>
      ) : (
        <div className="mt-5 space-y-4">
          {request.quotes.map((quote) => (
            <article aria-labelledby={`quote-${quote.id}-title`} className={cardClass} key={quote.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
                <h3 className="text-lg font-medium tabular-nums" id={`quote-${quote.id}-title`}>{quote.quoteNumber} · versi {quote.version}</h3>
                <span className={`inline-flex w-fit rounded-full border px-2.5 py-0.5 text-caption font-medium ${quote.decidable ? "border-warning-border bg-warning-background text-warning" : "border-border bg-neutral-50 text-foreground"}`}>
                  {quoteStatusLabel(quote.status)}
                </span>
              </div>
              <dl className="mt-4 space-y-2">
                <CostRow label="Material" value={formatRupiah(quote.materialRp)} />
                <CostRow label="Waktu mesin" value={formatRupiah(quote.machineRp)} />
                {quote.additionalCosts
                  ? quote.additionalCosts.map((cost, index) => <CostRow key={`${cost.name}-${index}`} label={cost.name} value={formatRupiah(cost.amountRp)} />)
                  : quote.additionalSubtotalRp !== "0" ? <CostRow label="Biaya tambahan" value={formatRupiah(quote.additionalSubtotalRp)} /> : null}
              </dl>
              <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-border pt-4">
                <p className="text-base font-semibold">Total</p>
                <p className="text-2xl font-semibold tracking-[-0.015em] tabular-nums">{formatRupiah(quote.finalTotalRp)}</p>
              </div>
              <p className="mt-2 text-caption leading-[1.45] text-muted-foreground">
                Berlaku sampai {quote.expiresAt ? dateFormatter.format(quote.expiresAt) : "belum ditentukan"}. Ongkir final ditentukan setelah paket diukur.
              </p>
              {quote.latest ? <QuoteDecision decidable={quote.decidable} quoteId={quote.id} requestId={request.id} /> : null}
            </article>
          ))}
        </div>
      )}
    </section>
  );

  return (
    <main className="overflow-x-hidden pb-16 sm:pb-24" data-request-state={request.status} id="main-content">
      <div className="mx-auto max-w-public px-5 pt-8 sm:px-12 sm:pt-10">
        <NiuvaLink className="min-h-11" href="/account" size="sm" variant="outline">
          <Icon aria-hidden="true" className="size-4" name="arrow-left" />
          Kembali ke akun
        </NiuvaLink>
        <h1 className={`${type.display.className} mt-8 max-w-[16em] text-balance`}>{customRequestStatusLabel(request.status)}</h1>
        <p className="mt-4 max-w-[56ch] text-lead leading-[1.6]">{customRequestStatusDescription(request.status)}</p>
        <dl className="mt-8 grid gap-px overflow-hidden rounded-[var(--radius-card)] border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
          {facts.map(([term, value]) => (
            <div className="bg-card px-5 py-4 sm:px-6" key={term}>
              <dt className="text-ui font-normal text-muted-foreground">{term}</dt>
              <dd className="mt-1 text-lg font-medium tabular-nums">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="mx-auto grid max-w-public items-start gap-12 px-5 pt-12 sm:px-12 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="min-w-0 space-y-12">
          {request.quotes.length > 0 ? quoteSection : null}
          <section aria-labelledby="make-estimate-title">
            <h2 className={sectionTitleClass} id="make-estimate-title">Estimasi produksi</h2>
            {estimate ? (
              <div className={`mt-5 ${cardClass}`}>
                <p className="text-3xl font-semibold tracking-[-0.02em] tabular-nums">{formatRupiah(estimate.lowerRp)}–{formatRupiah(estimate.upperRp)}</p>
                <p className="mt-2 text-ui font-normal leading-[1.55] text-muted-foreground">
                  Kisaran setelah review operator, bukan harga final. Versi {estimate.version}; ongkir belum termasuk.
                </p>
                {estimate.components ? (
                  <>
                    <h3 className="mt-6 text-base font-semibold">Komponen yang tercakup</h3>
                    <dl className="mt-3 space-y-2">
                      <CostRow label="Material" value={formatRupiah(estimate.components.materialRp)} />
                      <CostRow label="Waktu mesin" value={formatRupiah(estimate.components.machineRp)} />
                      {estimate.components.additionalCosts.map((cost, index) => (
                        <CostRow key={`${cost.name}-${index}`} label={cost.name} value={formatRupiah(cost.amountRp)} />
                      ))}
                      {estimate.components.additionalCosts.length === 0 ? <CostRow label="Pos tambahan" value="Tidak ada" /> : null}
                    </dl>
                    <p className="mt-4 text-caption leading-[1.45] text-muted-foreground">
                      Dasar review: {formatGrams(estimate.components.weightGrams)} g, {formatPrintDuration(estimate.components.printDurationSeconds)}, {estimate.components.material}, {estimate.components.quantity} unit, {filamentSourceLabel(estimate.components.filamentSource)}.
                    </p>
                  </>
                ) : null}
              </div>
            ) : (
              <div className="mt-5">
                <StatusNotice
                  description="Kisaran produksi muncul setelah operator memverifikasi model, hasil slicer, aturan harga, dan seluruh biaya pekerjaan."
                  title="Menunggu review operator"
                  tone="info"
                />
              </div>
            )}
          </section>

          {request.preview ? (
            <section aria-labelledby="make-preview-title">
              <h2 className={sectionTitleClass} id="make-preview-title">Simulasi biaya awal Anda</h2>
              <div className={`mt-5 ${cardClass}`}>
                <p className="text-2xl font-semibold tracking-[-0.015em] tabular-nums">{formatRupiah(request.preview.totalRp)}</p>
                <p className="mt-2 text-ui font-normal leading-[1.55] text-muted-foreground">
                  Dari berat {formatGrams(request.preview.weightGramsPerUnit)} g dan durasi {formatPrintDuration(request.preview.printDurationSecondsPerUnit)} per unit untuk {request.preview.quantity} unit, berdasarkan slicer Anda. Belum diverifikasi operator; hanya material dan waktu mesin, tanpa biaya lain atau ongkir.
                </p>
              </div>
            </section>
          ) : null}

          {request.quotes.length === 0 ? quoteSection : null}
        </div>

        <aside aria-label="Model dan perkiraan ongkir" className="space-y-4 lg:sticky lg:top-24">
          {request.canAppend && request.uploadsEnabled ? <AppendModelForm requestId={request.id} /> : null}
          {request.canAppend && !request.uploadsEnabled ? (
            <StatusNotice
              description="Pengajuan tetap tercatat. Sebutkan nomor referensi saat Niuva menindaklanjuti."
              title="Unggah model belum tersedia"
              tone="warning"
            />
          ) : null}
          <section aria-labelledby="make-shipping-title" className={cardClass}>
            <h2 className="text-xl font-medium tracking-[-0.015em]" id="make-shipping-title">Perkiraan ongkir</h2>
            <p className="mt-2 text-ui font-normal leading-[1.55] text-muted-foreground">
              Terpisah dari estimasi produksi dan bukan tagihan. Ongkir final dihitung setelah paket diukur.
            </p>
            {request.roughShippingAvailable ? (
              <RoughShippingForm requestId={request.id} />
            ) : (
              <p className="mt-4 text-ui font-normal leading-[1.55]">Tersedia setelah operator mencatat ukuran paket perkiraan.</p>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
