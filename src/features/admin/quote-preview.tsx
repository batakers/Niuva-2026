import { FileCheck2, LockKeyhole, ShieldCheck } from "lucide-react";

import { MoneySummary } from "@/components/niuva/money-summary";
import { StatusNotice } from "@/components/niuva/status-notice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  PreviewQuoteCalculation,
  PreviewQuoteFixture,
  PreviewQuoteStatus,
} from "@/features/admin/quote-preview-data";

type AdminQuotePreviewProps = Readonly<{
  calculation: PreviewQuoteCalculation | null;
  expiresAt: string | null;
  fixture: PreviewQuoteFixture;
  filamentSourceLabel: string;
  sentAt: string | null;
  scopeNotes: string;
  status: PreviewQuoteStatus;
}>;

function DefinitionItem({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm leading-6 text-foreground">{value}</dd>
    </div>
  );
}

export function AdminQuotePreview({
  calculation,
  expiresAt,
  fixture,
  filamentSourceLabel,
  sentAt,
  scopeNotes,
  status,
}: AdminQuotePreviewProps) {
  const quoteIsSent = status === "SENT";

  return (
    <aside aria-label="Preview quote" className="space-y-5 lg:sticky lg:top-5">
      <Card className="shadow-card" data-admin-quote-preview data-quote-status={status}>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-brand-700">Snapshot quote</p>
              <CardTitle className="mt-1">{fixture.quoteReference}</CardTitle>
            </div>
            <Badge
              className={quoteIsSent ? "border-success-border bg-success-background text-success" : "border-warning-border bg-warning-background text-warning"}
              variant="outline"
            >
              {quoteIsSent ? "Terkirim pada preview" : "Draft preview"}
            </Badge>
          </div>
          <CardDescription>
            {quoteIsSent
              ? "Snapshot ini terkunci setelah simulasi kirim dan tidak dapat diedit kembali."
              : "Nilai hanya dapat dipreview setelah rule aktif tersedia pada fixture."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl>
            <DefinitionItem label="Request" value={fixture.requestReference} />
            <DefinitionItem label="Material" value={fixture.materialCode} />
            <DefinitionItem label="Sumber filament" value={filamentSourceLabel} />
            <DefinitionItem label="Berat terverifikasi" value={`${fixture.verifiedWeightG} g`} />
            <DefinitionItem label="Durasi cetak" value={`${fixture.printDurationSeconds.toLocaleString("id-ID")} detik`} />
            <DefinitionItem label="Quantity" value={`${fixture.quantity} unit`} />
            <DefinitionItem label="Catatan scope" value={scopeNotes.trim().length > 0 ? scopeNotes : "Tidak ada catatan tambahan pada preview."} />
            {sentAt !== null ? <DefinitionItem label="Dikirim" value={sentAt} /> : null}
            {expiresAt !== null ? <DefinitionItem label="Berlaku sampai" value={expiresAt} /> : null}
          </dl>
        </CardContent>
      </Card>

      <MoneySummary
        currency="IDR"
        description={
          calculation === null
            ? "Tidak ada breakdown yang boleh dihitung sampai server memiliki pricing rule aktif yang tervalidasi."
            : "Breakdown preview ini memakai kalkulator Decimal yang sama dengan kontrak domain."
        }
        lines={calculation === null ? [] : [
          {
            label: "Material",
            value: calculation.materialSubtotalRp,
            detail: `${fixture.materialCode}, ${fixture.verifiedWeightG} g, ${fixture.quantity} unit`,
          },
          {
            label: "Waktu mesin",
            value: calculation.machineSubtotalRp,
            detail: `${fixture.printDurationSeconds.toLocaleString("id-ID")} detik hasil review operator`,
          },
          {
            label: "Subtotal sebelum pembulatan final",
            value: calculation.unroundedTotalRp,
            detail: "Fixture ini bernilai utuh. Pembulatan tetap hanya pada total final.",
          },
        ]}
        note={
          calculation === null
            ? "Rule aktif belum tersedia. Preview tidak memakai policy fallback dari browser."
            : "Fixture development. Server tetap membekukan rule aktif dan snapshot sebelum quote nyata dibuat atau dikirim."
        }
        sourceStatus={calculation === null ? "unavailable" : "ready"}
        title="Rincian draft quote"
        total={calculation?.finalTotalRp ?? "Belum tersedia"}
        variant="quote"
      />

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base"><ShieldCheck aria-hidden="true" className="size-4 text-brand-700" />Authority server</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
          <p className="flex gap-3"><FileCheck2 aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand-700" />Review operator, status request, material, quantity, dan pricing rule tetap harus valid pada saat server membuat draft.</p>
          <p className="flex gap-3"><LockKeyhole aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand-700" />Saat quote nyata dikirim, token publik, waktu kirim, expiry tujuh hari, dan snapshot harga diterbitkan atomically oleh server.</p>
          {quoteIsSent ? (
            <StatusNotice
              description="Preview ini tidak membuat token, email, audit, custom order, atau perubahan quote produksi."
              size="compact"
              title="Pengiriman hanya simulasi lokal"
              tone="info"
            />
          ) : null}
        </CardContent>
      </Card>
    </aside>
  );
}
