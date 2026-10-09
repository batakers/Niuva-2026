import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { withAdminReturnTo } from "@/modules/admin/navigation";

type Quote = Readonly<{ id: string; version: number; status: string; scope: string;
  totalRp: { toFixed(digits: number): string }; validUntil: Date; decidedAt: Date | null }>;

export function B2BQuoteAdminPanel({ inquiryId, quotes, returnTo = "/admin/inquiries", showWorkspaceLink = true }: Readonly<{ inquiryId: string; quotes: readonly Quote[]; returnTo?: string; showWorkspaceLink?: boolean }>) {
  return <Card as="section" aria-labelledby="b2b-quote-title" className="gap-0 py-0 ring-0 rounded-xl border border-border bg-card p-5 sm:p-6">
    <h2 className="text-xl font-semibold" id="b2b-quote-title">Proposal B2B untuk akun</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Setiap pengiriman membuat versi snapshot baru. Persetujuan customer hanya untuk tindak lanjut manual; status WON atau LOST tetap keputusan Admin.</p>
    {showWorkspaceLink ? <Link className={buttonVariants({ variant: "default", className: "mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" })} href={withAdminReturnTo(`/admin/inquiries/${inquiryId}/proposal`, returnTo)}>Buka workspace proposal</Link> : null}
    <div className="mt-6 space-y-3 border-t border-border pt-5">{quotes.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada proposal.</p> : quotes.map((quote) => <article className="rounded-lg border border-border p-4" key={quote.id}><p className="font-semibold">Versi {quote.version} · {quote.status}</p><p className="mt-2 text-sm">{quote.scope}</p><p className="mt-2 font-semibold">Rp {quote.totalRp.toFixed(0)}</p><p className="mt-1 text-sm text-muted-foreground">Berlaku sampai {quote.validUntil.toLocaleString("id-ID")}{quote.decidedAt ? ` · diputuskan ${quote.decidedAt.toLocaleString("id-ID")}` : ""}</p></article>)}</div>
  </Card>;
}
