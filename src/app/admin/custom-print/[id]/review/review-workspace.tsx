import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { NativeInput as Input } from "@/components/ui/input";
import Link from "next/link";
import { AdminActionForm } from "@/app/admin/admin-action-form";
import { createQuoteDraftAction, recordCustomPrintReviewAction, publishCustomPrintEstimateAction, saveEstimatedCustomPackageAction, reissueQuoteTokenAction, sendQuoteAction } from "@/app/admin/actions";
import { StatusNotice } from "@/components/niuva/status-notice";
import { withAdminReturnTo } from "@/modules/admin/navigation";
import { isEstimateCurrent } from "@/modules/custom-print/estimate";
import type { CustomPrintPageData } from "../custom-print-page-data";
export type ReviewStep = "review" | "estimate" | "quote";
export function parseReviewStep(value: unknown): ReviewStep { return value === "estimate" || value === "quote" ? value : "review"; }
const dateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" });
const currencyFormatter = new Intl.NumberFormat("id-ID", { currency: "IDR", maximumFractionDigits: 0, style: "currency" });
export function CustomPrintReviewWorkspace({ data, step, returnTo }: Readonly<{ data: CustomPrintPageData; step: ReviewStep; returnTo: string }>) {
  const { request, pricing, activeRule, latestEstimate } = data;
  const review = request.review;
  const estimateCurrent = latestEstimate !== null && isEstimateCurrent(latestEstimate.snapshot, review?.updatedAt, activeRule?.id);
  const hasDraft = request.quotes.some(quote => quote.status === "DRAFT");
  return <div className="space-y-6">
    <nav aria-label="Tahapan review dan quote" className="flex flex-wrap gap-2">
      {([["review", "1. Review slicer"], ["estimate", "2. Estimasi"], ["quote", "3. Quote"]] as const).map(([value, label]) => <Link className={`inline-flex min-h-11 items-center rounded-lg border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${step === value ? "border-brand-300 bg-brand-50 text-brand-900" : "border-border bg-card text-muted-foreground"}`} aria-current={step === value ? "step" : undefined} href={withAdminReturnTo(`/admin/custom-print/${request.id}/review?step=${value}`, returnTo)} key={value}>{label}</Link>)}
    </nav>
    {step === "review" ? <>
        <Card as="section" aria-labelledby="review-title" className="gap-0 py-0 ring-0 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="review-title">Review slicer operator</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Catat berat dan durasi yang sudah diverifikasi. Quantity harus sama dengan request agar quote dapat dihitung server.</p>
          {!request.modelReady ? (
            <StatusNotice className="mt-5" tone="info" title="Menunggu model 3D/CAD terverifikasi" description="Foto dan link referensi membantu triase, tetapi belum dapat dislicing. Customer dapat menambahkan model lewat tautan privat pada request yang sama." />
          ) : ["SUBMITTED", "UNDER_REVIEW", "QUOTE_READY", "QUOTE_SENT"].includes(request.status) ? (
            <AdminActionForm action={recordCustomPrintReviewAction} className="mt-5" confirmMessage={review ? "Merevisi review akan menahan quote sampai estimasi versi baru terbit. Lanjutkan?" : undefined} submitLabel={review ? "Revisi review slicer" : "Simpan review slicer"}>
              <input name="requestId" type="hidden" value={request.id} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Berat terverifikasi (g)" name="verifiedWeightG" required type="text" value={review?.verifiedWeightG ?? ""} />
                <Field label="Durasi print (detik)" name="printDurationSeconds" required type="number" value={String(review?.printDurationSeconds ?? "")} />
                {request.materialRequested === "NEEDS_RECOMMENDATION" && review === null
                  ? <Label className="grid gap-2 text-sm font-medium" htmlFor="materialCode"><span>Material code</span><NativeSelect className={inputClass} defaultValue="" id="materialCode" name="materialCode" required><NativeSelectOption disabled value="">Pilih setelah review</NativeSelectOption><NativeSelectOption value="PLA">PLA</NativeSelectOption><NativeSelectOption value="ABS">ABS</NativeSelectOption></NativeSelect></Label>
                  : <Field label="Material code" name="materialCode" required type="text" value={review?.materialCode ?? request.materialRequested.toUpperCase()} />}
                <Field label="Quantity" name="quantity" required type="number" value={String(review?.quantity ?? request.quantity)} />
              </div>
              <Label className="grid gap-2 text-sm font-medium" htmlFor="review-notes"><span>Catatan review</span><Textarea className={textareaClass} defaultValue={review?.notes ?? ""} id="review-notes" name="notes" rows={3} /></Label>
              <Label className="grid gap-2 text-sm font-medium" htmlFor="review-config"><span>Konfigurasi JSON <span className="font-normal text-muted-foreground">(opsional)</span></span><Textarea className={`${textareaClass} font-mono`} defaultValue={review?.configurationJson ? JSON.stringify(review.configurationJson, null, 2) : ""} id="review-config" name="configurationJson" rows={4} /></Label>
            </AdminActionForm>
          ) : (
            <StatusNotice className="mt-5" tone="info" title="Review slicer terkunci" description="Request ini sudah melewati tahap review. Perubahan produksi harus mengikuti quote atau workflow status berikutnya; form review tidak lagi aktif." />
          )}
        </Card>
      <StepLink id={request.id} step="estimate" returnTo={returnTo} label="Lanjut ke estimasi" />
    </> : step === "estimate" ? <>
        <Card as="section" aria-labelledby="estimate-title" className="gap-0 py-0 ring-0 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="estimate-title">Estimasi produksi pascareview</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Operator menilai seluruh biaya pekerjaan sebelum kisaran 100%–130% dipublikasikan. Faktor awal ini belum terkalibrasi oleh riwayat pekerjaan. Ongkir tidak termasuk.</p>
          {latestEstimate ? <p className="mt-4 rounded-lg border border-info-border bg-info-background p-4 text-sm font-medium text-info">Versi {latestEstimate.version} · {currencyFormatter.format(BigInt(latestEstimate.lowerRp.toFixed(0)))}–{currencyFormatter.format(BigInt(latestEstimate.upperRp.toFixed(0)))} · terbit {dateFormatter.format(latestEstimate.publishedAt)}{estimateCurrent ? "" : " · review atau tarif berubah, terbitkan versi baru"}</p> : <StatusNotice className="mt-4" title="Perlu review" description="Belum ada estimasi terbit untuk request ini." tone="info" />}
          {review && activeRule && request.modelReady && ["QUOTE_READY", "QUOTE_SENT"].includes(request.status) ? <AdminActionForm action={publishCustomPrintEstimateAction} className="mt-5" submitLabel={latestEstimate ? "Terbitkan versi estimasi baru" : "Terbitkan estimasi"}>
            <input name="requestId" type="hidden" value={request.id} /><input name="pricingRuleVersionId" type="hidden" value={activeRule.id} />
            <Label className="grid gap-2 text-sm font-medium" htmlFor="estimate-filament"><span>Sumber filamen hasil penilaian</span><NativeSelect className={inputClass} id="estimate-filament" name="filamentSource" required><NativeSelectOption value="NIUVA_STOCK">Stok Niuva</NativeSelectOption><NativeSelectOption value="COMMUNAL">Komunal</NativeSelectOption><NativeSelectOption value="CUSTOMER_OWN">Punya customer</NativeSelectOption></NativeSelect></Label>
            <Label className="grid gap-2 text-sm font-medium" htmlFor="estimate-extra"><span>Pos biaya tambahan bernama</span><Textarea className={textareaClass} id="estimate-extra" name="additionalCostsText" placeholder={"Setup | 50000\nFinishing | 25000"} rows={3} /><span className="font-normal text-muted-foreground">Satu pos per baris: Nama | nominal IDR bulat positif. Isi semua pos yang berlaku.</span></Label>
            <Label className="flex items-start gap-3 text-sm"><input className="mt-1 size-4" name="noAdditionalCosts" type="checkbox" value="yes" /><span>Saya sudah menilai pekerjaan ini dan menyatakan tidak ada pos biaya tambahan.</span></Label>
          </AdminActionForm> : <p className="mt-4 text-sm text-muted-foreground">Model, review slicer, dan pricing rule aktif diperlukan sebelum estimasi.</p>}
        </Card>
      <StepLink id={request.id} step="review" returnTo={returnTo} label="Periksa review slicer" />
      <StepLink id={request.id} step="quote" returnTo={returnTo} label="Lanjut ke quote" />
    </> : <>
        <Card as="section" aria-labelledby="quote-title" className="gap-0 py-0 ring-0 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="quote-title">Quote & pricing rule</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Setelah diterbitkan, snapshot quote menjadi immutable. Tautan ini disiapkan untuk dibagikan manual melalui kanal customer yang disepakati; Niuva belum mengirimkannya otomatis.</p>
          {pricing === null ? <StatusNotice className="mt-4" tone="warning" title="Pricing rules belum dapat dimuat" description="Draft quote ditahan sampai daftar aturan harga dapat dibaca oleh admin." /> : activeRule === null ? <StatusNotice className="mt-4" tone="warning" title="Belum ada pricing rule aktif" description="Owner harus mengaktifkan rule yang disetujui sebelum operator membuat quote." /> : <>
            <div className="mt-4 rounded-lg border border-info-border bg-info-background p-4 text-sm"><p className="font-semibold text-info">Rule aktif: {activeRule.code} v{activeRule.version}</p><p className="mt-1 text-info">Quote akan menyimpan snapshot rule ini. Perubahan rule baru tidak mengubah quote yang sudah dikirim.</p></div>
            {request.modelReady && review && !hasDraft && estimateCurrent && (request.status === "QUOTE_READY" || request.status === "QUOTE_SENT") ? <AdminActionForm action={createQuoteDraftAction} className="mt-5" submitLabel="Buat draft quote"><input name="requestId" type="hidden" value={request.id} /><input name="pricingRuleVersionId" type="hidden" value={activeRule.id} /><div className="grid gap-4 sm:grid-cols-2"><Label className="grid gap-2 text-sm font-medium" htmlFor="quote-material"><span>Material</span><NativeSelect className={inputClass} defaultValue={review.materialCode} id="quote-material" name="materialCode"><NativeSelectOption value="PLA">PLA</NativeSelectOption><NativeSelectOption value="ABS">ABS</NativeSelectOption></NativeSelect></Label><Label className="grid gap-2 text-sm font-medium" htmlFor="filament-source"><span>Sumber filamen sesuai estimasi</span><NativeSelect className={inputClass} id="filament-source" name="filamentSource"><NativeSelectOption value="NIUVA_STOCK">Stok Niuva</NativeSelectOption><NativeSelectOption value="COMMUNAL">Komunal</NativeSelectOption><NativeSelectOption value="CUSTOMER_OWN">Punya customer</NativeSelectOption></NativeSelect></Label></div><Label className="grid gap-2 text-sm font-medium" htmlFor="quote-config"><span>Konfigurasi tambahan <span className="font-normal text-muted-foreground">(opsional)</span></span><Textarea className={`${textareaClass} font-mono`} id="quote-config" name="configurationJson" rows={3} /></Label></AdminActionForm> : <p className="mt-5 text-sm text-muted-foreground">{hasDraft ? "Draft quote sudah tersedia. Kirim draft tersebut atau terbitkan versi baru setelah workflow sebelumnya selesai." : "Terbitkan estimasi setelah review slicer sebelum membuat draft."}</p>}
          </>}

          {!estimateCurrent ? <p className="mt-4 text-sm text-muted-foreground">Periksa review dan terbitkan estimasi terkini sebelum melanjutkan.</p> : null}
          <div className="mt-6 border-t border-border pt-5">
            {request.quotes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada quote untuk request ini.</p>
            ) : (
              <div className="grid gap-3">
                {request.quotes.map((quote) => (
                  <article className="rounded-lg border border-border p-4" key={quote.id}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-mono text-sm font-semibold">{quote.quoteNumber} · v{quote.version}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Dibuat {dateFormatter.format(quote.createdAt)}
                          {quote.expiresAt ? ` · berlaku sampai ${dateFormatter.format(quote.expiresAt)}` : ""}
                        </p>
                      </div>
                      <span className="rounded-md border border-brand-300 bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
                        {formatStatus(quote.status)}
                      </span>
                    </div>
                    <p className="mt-4 text-lg font-semibold tabular-nums">
                      {currencyFormatter.format(BigInt(quote.finalTotalRp))}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {quote.status === "DRAFT" && request.modelReady && review && activeRule && estimateCurrent && ["QUOTE_READY", "QUOTE_SENT"].includes(request.status) ? (
                        <AdminActionForm
                          action={sendQuoteAction}
                          confirmMessage="Terbitkan quote ini dan siapkan tautan untuk dibagikan manual kepada customer? Snapshot quote menjadi immutable setelah diterbitkan."
                          submitLabel="Terbitkan quote"
                          successLinkLabel="Buka tautan quote"
                        >
                          <input name="quoteId" type="hidden" value={quote.id} />
                          <input name="requestId" type="hidden" value={request.id} />
                        </AdminActionForm>
                      ) : quote.status === "SENT" && request.customerId === null ? (
                        <AdminActionForm
                          action={reissueQuoteTokenAction}
                          confirmMessage="Terbitkan tautan quote baru dan cabut token lama?"
                          submitLabel="Terbitkan ulang tautan"
                        >
                          <input name="quoteId" type="hidden" value={quote.id} />
                          <input name="requestId" type="hidden" value={request.id} />
                        </AdminActionForm>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </Card>
{!["CANCELLED", "DECLINED"].includes(request.status) ? <>
        <Card as="section" aria-labelledby="rough-package-title" className="gap-0 py-0 ring-0 rounded-xl border border-border bg-card p-5 sm:p-6">
          <h2 className="text-xl font-semibold" id="rough-package-title">Paket perkiraan untuk cek ongkir</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Customer dapat meminta rate testing dari akun setelah paket perkiraan terisi. Ongkir kasar tidak masuk quote, order, atau pembayaran.</p>
          <AdminActionForm action={saveEstimatedCustomPackageAction} className="mt-5" submitLabel="Simpan paket perkiraan">
            <input name="requestId" type="hidden" value={request.id} />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><Field label="Berat (g)" name="weightGrams" required type="number" value="" /><Field label="Panjang (cm)" name="lengthCm" required type="number" value="" /><Field label="Lebar (cm)" name="widthCm" required type="number" value="" /><Field label="Tinggi (cm)" name="heightCm" required type="number" value="" /><Field label="Nilai paket (IDR)" name="declaredValueRp" required type="number" value="" /></div>
          </AdminActionForm>
        </Card>
</> : null}
      <StepLink id={request.id} step="estimate" returnTo={returnTo} label="Periksa estimasi" />
    </>}
  </div>;
}
function StepLink({ id, step, returnTo, label }: Readonly<{ id: string; step: ReviewStep; returnTo: string; label: string }>) { return <Link className={buttonVariants({ variant: "outline", className: "mr-3 inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 text-sm font-semibold text-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" })} href={withAdminReturnTo(`/admin/custom-print/${id}/review?step=${step}`, returnTo)}>{label}</Link>; }
function Field({ label, name, required, type, value }: Readonly<{ label: string; name: string; required?: boolean; type: string; value: string }>) { return <Label className="grid gap-2 text-sm font-medium" htmlFor={name}><span>{label}</span><Input className={inputClass} defaultValue={value} id={name} name={name} required={required} type={type} /></Label>; }
function formatStatus(value: string): string { return value.toLocaleLowerCase("id").split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "); }
const inputClass = "min-h-11 rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";
const textareaClass = "min-h-24 rounded-lg border border-input bg-background px-3 py-2 text-base leading-6 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm";
