import { AdminActionForm } from "@/app/admin/admin-action-form";
import { sendB2BQuoteAction } from "@/app/admin/actions";

type Quote = Readonly<{ id: string; version: number; status: string; scope: string;
  totalRp: { toFixed(digits: number): string }; validUntil: Date; decidedAt: Date | null }>;
const fieldClass = "min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2 text-base focus-visible:ring-3 focus-visible:ring-ring/50";

export function B2BQuoteAdminPanel({ inquiryId, quotes }: Readonly<{ inquiryId: string; quotes: readonly Quote[] }>) {
  return <section aria-labelledby="b2b-quote-title" className="rounded-xl border border-border bg-card p-5 sm:p-6">
    <h2 className="text-xl font-semibold" id="b2b-quote-title">Proposal B2B untuk akun</h2>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">Setiap pengiriman membuat versi snapshot baru. Persetujuan customer hanya untuk tindak lanjut manual; status WON atau LOST tetap keputusan Admin.</p>
    <AdminActionForm action={sendB2BQuoteAction} className="mt-5" confirmMessage="Kirim proposal terstruktur ini ke akun customer? Versi yang dikirim tidak dapat diubah." submitLabel="Kirim versi proposal">
      <input name="inquiryId" type="hidden" value={inquiryId} />
      <label className="grid gap-2 text-sm font-medium" htmlFor="b2b-scope">Scope pekerjaan<textarea className={fieldClass} id="b2b-scope" name="scope" required rows={4} /></label>
      <label className="grid gap-2 text-sm font-medium" htmlFor="b2b-assumptions">Asumsi proposal<textarea className={fieldClass} id="b2b-assumptions" name="assumptions" required rows={3} /></label>
      <label className="grid gap-2 text-sm font-medium" htmlFor="b2b-lines">Pos biaya IDR<textarea className={fieldClass} id="b2b-lines" name="lineItemsText" placeholder={"Desain awal | 1500000\nPrototype | 750000"} required rows={4} /><span className="font-normal text-muted-foreground">Satu pos per baris: Nama | nominal IDR bulat positif.</span></label>
      <label className="grid gap-2 text-sm font-medium" htmlFor="b2b-valid">Berlaku sampai tanggal<input className={fieldClass} id="b2b-valid" name="validUntil" required type="date" /></label>
    </AdminActionForm>
    <div className="mt-6 space-y-3 border-t border-border pt-5">{quotes.length === 0 ? <p className="text-sm text-muted-foreground">Belum ada proposal.</p> : quotes.map((quote) => <article className="rounded-lg border border-border p-4" key={quote.id}><p className="font-semibold">Versi {quote.version} · {quote.status}</p><p className="mt-2 text-sm">{quote.scope}</p><p className="mt-2 font-semibold">Rp {quote.totalRp.toFixed(0)}</p><p className="mt-1 text-sm text-muted-foreground">Berlaku sampai {quote.validUntil.toLocaleString("id-ID")}{quote.decidedAt ? ` · diputuskan ${quote.decidedAt.toLocaleString("id-ID")}` : ""}</p></article>)}</div>
  </section>;
}
