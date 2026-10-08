import { requireAdmin } from "@/lib/auth/admin";
import { apiError } from "@/lib/http/response";
import { InvoiceService } from "@/modules/finance/invoice-service";
import { renderInvoicePdf } from "@/modules/finance/invoice-pdf";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: Readonly<{ params: Promise<{ id: string }> }>): Promise<Response> {
  try {
    const { id } = await params;
    const access = await requireAdmin(), service = new InvoiceService();
    const document = await service.document(access, id);
    const bytes = await renderInvoicePdf(document);
    // Recheck closure after generation before returning named buyer content.
    await service.document(access, id);
    return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${document.number}.pdf"`, "Cache-Control": "no-store", Vary: "Cookie", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { const response = apiError(error, undefined, { boundary: "api:GET /api/admin/invoices/[id]/pdf" }); response.headers.set("Cache-Control", "no-store"); response.headers.set("Vary", "Cookie"); return response; }
}
