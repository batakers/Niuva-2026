import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { PublicShell } from "@/components/niuva/public-shell";
import { RefundCaseSummary } from "@/components/niuva/refund-case-summary";
import { RefundWorkflowForm } from "@/components/niuva/refund-workflow-form";
import { Card } from "@/components/ui/card";
import { typographySystemTokens } from "@/design/typography";
import { requireCustomer } from "@/lib/auth/customer";
import { RefundService } from "@/modules/refund/service";
import { isAppError } from "@/modules/shared/errors";
import { requestRefundAction } from "./actions";

export const metadata: Metadata = { title: "Pengajuan refund · Akun Niuva", robots: { index: false, follow: false } };
const money = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
export default async function CustomerRefundPage({ params }: PageProps<"/account/orders/[id]/refund">) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  let customer;
  try { customer = await requireCustomer(); }
  catch (error) { if (isAppError(error) && error.code === "UNAUTHORIZED") redirect(`/login?returnTo=${encodeURIComponent(`/account/orders/${id}/refund`)}`); throw error; }
  const view = await new RefundService().customerOrder(customer.id, id).catch(error => { if (isAppError(error) && error.code === "NOT_FOUND") notFound(); throw error; });
  const path = `/account/orders/${id}/refund`;
  return <PublicShell scope="account" functionalStatus="server-backed"><main id="main-content" className="mx-auto w-full max-w-reading space-y-8 px-5 py-12 sm:px-8">
    <header className="space-y-4"><Link className="inline-flex min-h-11 items-center text-sm underline underline-offset-4" href={`/account/orders/${id}`}>Kembali ke order</Link>
      <p className="break-words text-sm text-muted-foreground">{view.orderNumber}</p><h1 className={typographySystemTokens.heading.className}>Pengajuan refund</h1>
      <p className="text-sm leading-6 text-muted-foreground">Nominal mengikuti pembayaran yang telah diterima Niuva. Pengajuan diperiksa terlebih dahulu dan memerlukan persetujuan Owner.</p>
    </header>
    {view.refund ? <Card as="section" aria-labelledby="refund-case-heading" className="gap-5 p-5 sm:p-6"><h2 id="refund-case-heading" className="text-xl font-semibold">Kasus refund Anda</h2><RefundCaseSummary refund={view.refund} /></Card>
      : view.eligibleAmountRp ? <Card as="section" aria-labelledby="refund-request-heading" className="gap-0 p-5 sm:p-6"><h2 id="refund-request-heading" className="text-xl font-semibold">Ajukan pemeriksaan</h2>
        <p className="mt-3 text-sm leading-6">Total pembayaran terverifikasi: <strong className="tabular-nums">{money.format(BigInt(view.eligibleAmountRp))}</strong>. Syarat retur akan diperiksa sesuai kondisi pesanan.</p>
        <RefundWorkflowForm action={requestRefundAction.bind(null, id)} mode="request" permalink={path} submissionKey={randomUUID()} />
      </Card> : <Card as="section" className="gap-3 p-5 sm:p-6"><h2 className="text-xl font-semibold">Pembayaran perlu diperiksa</h2><p className="text-sm leading-6">{view.eligibilityIssue}</p><p className="text-sm leading-6">Untuk keluhan atau tindak lanjut, hubungi <a className="underline underline-offset-4" href="mailto:niuvamakerspace@gmail.com">niuvamakerspace@gmail.com</a> dengan nomor order ini.</p></Card>}
  </main></PublicShell>;
}
