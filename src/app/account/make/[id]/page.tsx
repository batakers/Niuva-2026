import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";

import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { requireCustomer } from "@/lib/auth/customer";
import { getServerCapabilities } from "@/lib/env/server";
import { CustomerWorkRepository } from "@/modules/customer-work/repository";
import { isModelExtension } from "@/modules/custom-print/file-types";
import { additionalCostSchema, isEstimateCurrent } from "@/modules/custom-print/estimate";
import { readCustomerPreviewSnapshot } from "@/modules/custom-print/customer-preview";
import { isAppError } from "@/modules/shared/errors";
import { AppendModelForm } from "@/app/custom-print/requests/[token]/append-model-form";
import { QuoteDecision } from "./quote-decision";
import { RoughShippingForm } from "./rough-shipping-form";

const quoteExtrasSchema = z.object({ estimate: z.object({ additionalCosts: z.array(additionalCostSchema) }) });
const estimateComponentsSchema = z.object({
  additionalCosts: z.array(additionalCostSchema),
  machineSubtotalRp: z.string(),
  materialSubtotalRp: z.string(),
  pricingInputs: z.object({
    filamentSource: z.string(),
    material: z.string(),
    printDurationSeconds: z.number().int(),
    quantity: z.number().int(),
    weightGrams: z.string(),
  }),
});

export const metadata: Metadata = { title: "MAKE · Akun Niuva", robots: { index: false, follow: false } };
export default async function AccountMakePage({ params }: PageProps<"/account/make/[id]">) {
  await connection();
  let customer;
  try { customer = await requireCustomer(); }
  catch (error) {
    if (isAppError(error) && error.code === "UNAUTHORIZED") redirect("/login?returnTo=/account");
    throw error;
  }
  const { id } = await params;
  const request = await new CustomerWorkRepository().request(customer.id, id);
  if (request === null) notFound();
  const modelReady = request.files.some(({ file }) => file.uploadStatus === "VERIFIED" && isModelExtension(file.extension));
  let uploadsEnabled = false;
  try { uploadsEnabled = getServerCapabilities().customUploads; } catch { /* capability gated */ }
  const canAppend = request.intakeMode === "REFERENCE_ONLY" && !modelReady && ["SUBMITTED", "UNDER_REVIEW"].includes(request.status);
  const estimate = request.estimates[0] && isEstimateCurrent(request.estimates[0].snapshot, request.review?.updatedAt)
    ? request.estimates[0] : undefined;
  const estimateComponents = estimate ? estimateComponentsSchema.safeParse(estimate.snapshot) : null;
  const customerPreview = readCustomerPreviewSnapshot(request.customerPreviewSnapshot);
  return <PublicShell scope="account" functionalStatus="server-backed"><main id="main-content" className="mx-auto max-w-public px-5 py-12 sm:px-8">
    <Link className="text-sm underline underline-offset-4" href="/account">Kembali ke akun</Link>
    <p className="mt-8 text-sm font-medium text-brand-700">MAKE · {request.referenceNumber}</p>
    <h1 className="mt-3 text-3xl font-semibold">Status custom print</h1>
    <dl className="mt-8 grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-2">
      <div><dt className="text-sm text-muted-foreground">Status</dt><dd className="mt-1 font-medium">{request.status}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Jalur awal</dt><dd className="mt-1 font-medium">{request.intakeMode === "REFERENCE_ONLY" ? "Referensi awal" : "Model siap"}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Model terverifikasi</dt><dd className="mt-1 font-medium">{modelReady ? "Sudah tersedia" : "Belum tersedia"}</dd></div>
      <div><dt className="text-sm text-muted-foreground">File diterima</dt><dd className="mt-1 font-medium">{request.files.map(({ file }) => file.extension.toUpperCase()).join(" · ") || "Belum ada"}</dd></div>
    </dl>
    <h2 className="mt-10 text-xl font-semibold">Estimasi produksi operator</h2>
    {estimate ? <div className="mt-3 rounded-xl border border-border bg-card p-6">
      <p className="text-2xl font-semibold">Rp {estimate.lowerRp.toFixed(0)}–Rp {estimate.upperRp.toFixed(0)}</p>
      <p className="mt-2 text-sm text-muted-foreground">Kisaran setelah review operator, bukan harga final. Versi {estimate.version}; ongkir belum termasuk.</p>
      {estimateComponents?.success ? <>
        <h3 className="mt-6 font-semibold">Komponen yang tercakup</h3>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between gap-3"><dt>Material</dt><dd>Rp {estimateComponents.data.materialSubtotalRp}</dd></div>
          <div className="flex justify-between gap-3"><dt>Waktu mesin</dt><dd>Rp {estimateComponents.data.machineSubtotalRp}</dd></div>
          {estimateComponents.data.additionalCosts.map((cost, index) => <div className="flex justify-between gap-3" key={`${cost.name}-${index}`}><dt>{cost.name}</dt><dd>Rp {cost.amountRp}</dd></div>)}
          {estimateComponents.data.additionalCosts.length === 0 ? <div><dt>Pos tambahan</dt><dd>Dinyatakan tidak ada oleh operator.</dd></div> : null}
        </dl>
        <p className="mt-4 text-sm text-muted-foreground">Dasar review: {estimateComponents.data.pricingInputs.weightGrams} g, {estimateComponents.data.pricingInputs.printDurationSeconds} detik, {estimateComponents.data.pricingInputs.material}, {estimateComponents.data.pricingInputs.quantity} unit, sumber filamen {estimateComponents.data.pricingInputs.filamentSource}.</p>
      </> : null}
    </div> : <div className="mt-3"><StatusNotice title="Perlu review" description="Kisaran produksi akan muncul setelah operator memverifikasi model, hasil slicer, aturan harga, dan seluruh biaya pekerjaan." tone="info" /></div>}
    {customerPreview ? <section className="mt-8 rounded-xl border border-border bg-card p-6" aria-labelledby="customer-preview-history-title">
      <h2 className="text-lg font-semibold" id="customer-preview-history-title">Simulasi biaya awal Anda</h2>
      <p className="mt-2 text-xl font-semibold">Rp {customerPreview.result.finalTotalRp}</p>
      <p className="mt-2 text-sm text-muted-foreground">Dari berat {customerPreview.input.weightGramsPerUnit} g dan durasi {customerPreview.input.printDurationSecondsPerUnit} detik per unit untuk {customerPreview.input.quantity} unit, berdasarkan slicer Anda. Belum diverifikasi operator; hanya komponen material dan waktu mesin, tanpa biaya lain atau ongkir.</p>
    </section> : null}
    <h2 className="mt-10 text-xl font-semibold">Quote</h2>
    {request.quotes.filter((quote) => quote.status !== "DRAFT").length === 0 ? <p className="mt-3 text-muted-foreground">Quote belum dikirim.</p> : request.quotes.filter((quote) => quote.status !== "DRAFT").map((quote) => {
      const extras = quoteExtrasSchema.safeParse(quote.calculationSnapshot);
      return <article key={quote.id} className="mt-3 rounded-xl border border-border bg-card p-6"><h3 className="font-semibold">{quote.quoteNumber} · v{quote.version} · {quote.status}</h3>
        <dl className="mt-4 space-y-2 text-sm"><div className="flex justify-between gap-3"><dt>Material</dt><dd>Rp {quote.materialSubtotalRp.toFixed(0)}</dd></div><div className="flex justify-between gap-3"><dt>Waktu mesin</dt><dd>Rp {quote.machineSubtotalRp.toFixed(0)}</dd></div>
          {extras.success ? extras.data.estimate.additionalCosts.map((cost, index) => <div className="flex justify-between gap-3" key={`${cost.name}-${index}`}><dt>{cost.name}</dt><dd>Rp {cost.amountRp}</dd></div>) : quote.additionalSubtotalRp.gt(0) ? <div className="flex justify-between gap-3"><dt>Biaya tambahan</dt><dd>Rp {quote.additionalSubtotalRp.toFixed(0)}</dd></div> : null}
        </dl><p className="mt-4 border-t border-border pt-3 text-lg font-semibold">Total Rp {quote.finalTotalRp.toFixed(0)}</p><p className="mt-1 text-sm text-muted-foreground">Berlaku sampai {quote.expiresAt?.toLocaleString("id-ID") ?? "Belum ditentukan"}. Ongkir final ditentukan setelah paket diukur.</p>
        {request.quotes[0]?.id === quote.id && quote.status === "SENT" && quote.expiresAt && quote.expiresAt > new Date() &&
          (estimate ? quote.estimateId === estimate.id : quote.estimateId === null) ? <QuoteDecision quoteId={quote.id} requestId={request.id} /> : null}
      </article>;
    })}
    {canAppend && uploadsEnabled ? <AppendModelForm requestId={request.id} /> : null}
    {canAppend && !uploadsEnabled ? <div className="mt-6"><StatusNotice title="Upload model belum tersedia" description="Request tetap tercatat. Gunakan nomor referensi untuk tindak lanjut manual." tone="warning" /></div> : null}
    <h2 className="mt-10 text-xl font-semibold">Ongkir kasar terpisah</h2>
    {request.estimatedPackage ? <RoughShippingForm requestId={request.id} /> : <p className="mt-3 text-muted-foreground">Ongkir menyusul. Operator belum mencatat paket perkiraan.</p>}
  </main></PublicShell>;
}
