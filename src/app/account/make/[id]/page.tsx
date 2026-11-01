import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";

import { PublicShell } from "@/components/niuva/public-shell";
import { requireCustomer } from "@/lib/auth/customer";
import { getServerCapabilities } from "@/lib/env/server";
import { CustomerWorkRepository } from "@/modules/customer-work/repository";
import { isModelExtension } from "@/modules/custom-print/file-types";
import { additionalCostSchema, isEstimateCurrent } from "@/modules/custom-print/estimate";
import { readCustomerPreviewSnapshot } from "@/modules/custom-print/customer-preview";
import { isAppError } from "@/modules/shared/errors";

import { MakeDetailView } from "./make-detail-view";

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

export const metadata: Metadata = { title: "Custom 3D Print · Akun Niuva", robots: { index: false, follow: false } };
export default async function AccountMakePage({ params }: PageProps<"/account/make/[id]">) {
  await connection();
  const { id } = await params;
  let customer;
  try { customer = await requireCustomer(); }
  catch (error) {
    if (isAppError(error) && error.code === "UNAUTHORIZED") redirect(`/login?returnTo=${encodeURIComponent(`/account/make/${id}`)}`);
    throw error;
  }
  const request = await new CustomerWorkRepository().request(customer.id, id);
  if (request === null) notFound();
  const modelReady = request.files.some(({ file }) => file.uploadStatus === "VERIFIED" && isModelExtension(file.extension));
  let uploadsEnabled = false;
  try { uploadsEnabled = getServerCapabilities().customUploads; } catch { /* capability gated */ }
  const canAppend = request.intakeMode === "REFERENCE_ONLY" && !modelReady && ["SUBMITTED", "UNDER_REVIEW"].includes(request.status);
  const estimate = request.estimates[0] && isEstimateCurrent(request.estimates[0].snapshot, request.review?.updatedAt)
    ? request.estimates[0] : undefined;
  const components = estimate ? estimateComponentsSchema.safeParse(estimate.snapshot) : null;
  const customerPreview = readCustomerPreviewSnapshot(request.customerPreviewSnapshot);
  const now = new Date();
  const latestQuoteId = request.quotes[0]?.id;
  const quotes = request.quotes.filter((quote) => quote.status !== "DRAFT").map((quote) => {
    const extras = quoteExtrasSchema.safeParse(quote.calculationSnapshot);
    return {
      additionalCosts: extras.success ? extras.data.estimate.additionalCosts : null,
      additionalSubtotalRp: quote.additionalSubtotalRp.toFixed(0),
      decidable: latestQuoteId === quote.id && quote.status === "SENT" && quote.expiresAt !== null && quote.expiresAt > now
        && (estimate ? quote.estimateId === estimate.id : quote.estimateId === null),
      expiresAt: quote.expiresAt,
      finalTotalRp: quote.finalTotalRp.toFixed(0),
      id: quote.id,
      latest: latestQuoteId === quote.id,
      machineRp: quote.machineSubtotalRp.toFixed(0),
      materialRp: quote.materialSubtotalRp.toFixed(0),
      quoteNumber: quote.quoteNumber,
      status: quote.status,
      version: quote.version,
    };
  });
  return <PublicShell scope="account" functionalStatus="server-backed">
    <MakeDetailView request={{
      canAppend,
      estimate: estimate ? {
        components: components?.success ? {
          additionalCosts: components.data.additionalCosts,
          filamentSource: components.data.pricingInputs.filamentSource,
          machineRp: components.data.machineSubtotalRp,
          material: components.data.pricingInputs.material,
          materialRp: components.data.materialSubtotalRp,
          printDurationSeconds: components.data.pricingInputs.printDurationSeconds,
          quantity: components.data.pricingInputs.quantity,
          weightGrams: components.data.pricingInputs.weightGrams,
        } : null,
        lowerRp: estimate.lowerRp.toFixed(0),
        upperRp: estimate.upperRp.toFixed(0),
        version: estimate.version,
      } : null,
      fileExtensions: request.files.map(({ file }) => file.extension.toUpperCase()),
      id: request.id,
      intakeMode: request.intakeMode,
      modelReady,
      preview: customerPreview ? {
        printDurationSecondsPerUnit: customerPreview.input.printDurationSecondsPerUnit,
        quantity: customerPreview.input.quantity,
        totalRp: customerPreview.result.finalTotalRp,
        weightGramsPerUnit: customerPreview.input.weightGramsPerUnit,
      } : null,
      quotes,
      referenceNumber: request.referenceNumber,
      roughShippingAvailable: request.estimatedPackage !== null,
      status: request.status,
      uploadsEnabled,
    }} />
  </PublicShell>;
}
