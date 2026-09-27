import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { z } from "zod";

import { PublicShell } from "@/components/niuva/public-shell";
import { requireCustomer } from "@/lib/auth/customer";
import { CustomerWorkRepository } from "@/modules/customer-work/repository";
import { b2bQuoteLineSchema } from "@/modules/inquiry/b2b-quote";
import { isAppError } from "@/modules/shared/errors";
import { B2BQuoteDecision } from "./b2b-quote-decision";

export const metadata: Metadata = { title: "Project Brief · Akun Niuva", robots: { index: false, follow: false } };
export default async function AccountInquiryPage({ params }: PageProps<"/account/inquiries/[id]">) {
  await connection();
  let customer;
  try { customer = await requireCustomer(); }
  catch (error) {
    if (isAppError(error) && error.code === "UNAUTHORIZED") redirect("/login?returnTo=/account");
    throw error;
  }
  const { id } = await params;
  const inquiry = await new CustomerWorkRepository().inquiry(customer.id, id);
  if (inquiry === null) notFound();
  return <PublicShell scope="account" functionalStatus="server-backed"><main id="main-content" className="mx-auto max-w-public px-5 py-12 sm:px-8">
    <Link className="text-sm underline underline-offset-4" href="/account">Kembali ke akun</Link>
    <p className="mt-8 text-sm font-medium text-brand-700">Project Brief · {inquiry.referenceNumber}</p>
    <h1 className="mt-3 text-3xl font-semibold">{inquiry.projectGoal}</h1>
    <dl className="mt-8 grid gap-4 rounded-xl border border-border bg-card p-6 sm:grid-cols-2">
      <div><dt className="text-sm text-muted-foreground">Status inquiry</dt><dd className="mt-1 font-medium">{inquiry.status}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Tahap</dt><dd className="mt-1 font-medium">{inquiry.currentStage}</dd></div>
      <div><dt className="text-sm text-muted-foreground">Target waktu</dt><dd className="mt-1 font-medium">{inquiry.targetDeadline?.toLocaleDateString("id-ID") ?? "Belum diketahui"}</dd></div>
    </dl>
    <h2 className="mt-10 text-xl font-semibold">Konteks yang dikirim</h2><p className="mt-3 whitespace-pre-wrap leading-7">{inquiry.description}</p>
    <h2 className="mt-10 text-xl font-semibold">Proposal B2B</h2>
    {inquiry.quotes.filter((quote) => quote.status !== "DRAFT").length === 0 ? <p className="mt-3 text-muted-foreground">Belum ada proposal yang dikirim.</p> : inquiry.quotes.filter((quote) => quote.status !== "DRAFT").map((quote) => {
      const lines = z.array(b2bQuoteLineSchema).safeParse(quote.lineItems);
      return <article key={quote.id} className="mt-4 rounded-xl border border-border bg-card p-6">
      <h3 className="font-semibold">Versi {quote.version} · {quote.status}</h3><p className="mt-2">{quote.scope}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">Asumsi: {quote.assumptions}</p>
      {lines.success ? <dl className="mt-4 space-y-2 text-sm">{lines.data.map((line, index) => <div className="flex justify-between gap-3" key={`${line.name}-${index}`}><dt>{line.name}</dt><dd>Rp {line.amountRp}</dd></div>)}</dl> : null}
      <p className="mt-3 font-semibold">Total Rp {quote.totalRp.toFixed(0)}</p>
      <p className="mt-1 text-sm text-muted-foreground">Berlaku sampai {quote.validUntil.toLocaleString("id-ID")}. Persetujuan ini untuk tindak lanjut manual; belum membuat order, invoice, kontrak, atau pembayaran.</p>
      {inquiry.quotes[0]?.id === quote.id && quote.status === "SENT" && quote.validUntil > new Date() ? <B2BQuoteDecision inquiryId={inquiry.id} quoteId={quote.id} /> : null}
    </article>; })}
  </main></PublicShell>;
}
