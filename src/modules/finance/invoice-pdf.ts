import { invoicePaymentInstructions } from "./presentation";
import "server-only";
import PDFDocument from "pdfkit";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { InvoiceDocument } from "./types";
const rp = (value: string) => `Rp ${BigInt(value).toLocaleString("id-ID")}`;
export async function renderInvoicePdf(invoice: InvoiceDocument): Promise<Uint8Array> {
  const font = await readFile(path.join(process.cwd(), "src/modules/finance/pdf-assets/SpaceGrotesk.ttf"));
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 48, tagged: true, lang: "id-ID", pdfVersion: "1.7", displayTitle: true, info: { Title: `Invoice ${invoice.number}`, Author: invoice.financial.issuer.issuerName, Subject: "Dokumen tagihan Niuva" } });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    try {
      doc.font(font);
      const root = doc.struct("Document", { lang: "id-ID" }); doc.addStructure(root);
      const text = (value: string, tag: "H1" | "H2" | "P" = "P") => {
        root.add(doc.struct(tag, {}, () => { doc.fontSize(tag === "H1" ? 25 : tag === "H2" ? 14 : 10).fillColor("#14263A").text(`${value} `, { lineGap: 3 }); doc.moveDown(tag === "P" ? 0.5 : 0.8); }));
      };
      text("INVOICE", "H1"); text(`${invoice.number} · Revisi ${invoice.revision}`);
      text(`Diterbitkan ${new Date(invoice.issuedAt).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}`);
      if (invoice.state !== "ISSUED") text(invoice.state === "VOID" ? "DOKUMEN DIBATALKAN — periksa riwayat penagihan." : "DOKUMEN DIGANTI — gunakan revisi invoice terbaru.");
      text("Penerbit", "H2"); text(invoice.financial.issuer.issuerName); text(invoice.financial.issuer.issuerAddress); text(invoice.financial.issuer.issuerEmail);
      text("Ditagihkan kepada", "H2"); text(invoice.buyer.name); text(`${invoice.buyer.email} · ${invoice.buyer.phone}`);
      text(`Sumber: ${invoice.financial.sourceReference}`);
      text("Rincian tagihan", "H2");
      for (const [index, item] of invoice.financial.items.entries()) text(`${index + 1}. ${item.name} — ${rp(item.amountRp)}`);
      text(`Total invoice: ${rp(invoice.financial.totalRp)}`, "H2");
      text("Pola pembayaran", "H2");
      if (invoice.financial.mode === "DEPOSIT_BALANCE" && invoice.financial.depositRp) {
        text(`DP: ${rp(invoice.financial.depositRp)}${invoice.financial.depositDueDate ? ` · jatuh tempo ${invoice.financial.depositDueDate}` : ""}`);
        text(`Pelunasan: sisa nilai proyek${invoice.financial.balanceDueDate ? ` · jatuh tempo ${invoice.financial.balanceDueDate}` : ""}`);
      } else text(`Pembayaran penuh${invoice.financial.balanceDueDate ? ` · jatuh tempo ${invoice.financial.balanceDueDate}` : ""}`);
      text("Instruksi pembayaran", "H2"); for (const line of invoicePaymentInstructions(invoice.financial)) text(line);
      text("Ringkasan pembayaran saat unduh", "H2"); text(`Diperiksa ${new Date(invoice.payment.checkedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB`);
      text(`Penerimaan terkonfirmasi: ${rp(invoice.payment.paidRp)} · Sisa tagihan: ${rp(invoice.payment.remainingRp)}`);
      if (invoice.payment.state === "REVIEW") text("Pembayaran memerlukan pemeriksaan. Refund atau koreksi belum tentu tercermin sebagai saldo bersih.");
      text("Nilai invoice tetap sesuai dokumen terbit. Ringkasan pembayaran ditampilkan terpisah dan dapat berubah. Dokumen ini bukan faktur pajak.");
      root.end(); doc.end();
    } catch (error) { doc.destroy(); reject(error); }
  });
}
