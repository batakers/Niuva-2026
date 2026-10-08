"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { toAppErrorLogged } from "@/lib/observability/report";
import type { AdminAction } from "@/app/admin/actions";
import { B2BBillingService } from "@/modules/finance/b2b-billing-service";
import { ManualPaymentService } from "@/modules/finance/manual-payment-service";
const text = (form: FormData, key: string) => typeof form.get(key) === "string" ? String(form.get(key)) : "";
function refresh(inquiryId: string) { revalidatePath(`/admin/inquiries/${inquiryId}/billing`); revalidatePath("/admin/finance"); revalidatePath("/admin/finance/payments"); revalidatePath("/admin/finance/invoices"); revalidatePath("/admin"); }
export const setB2BTermsAction: AdminAction = async (_previous, form) => {
  try {
    const inquiryId = text(form, "inquiryId"), mode = text(form, "mode");
    await new B2BBillingService().setTerms(await requireAdmin(), { inquiryId, acceptedQuoteId: text(form, "acceptedQuoteId"), expectedVersion: Number(form.get("expectedVersion")), mode, depositRp: mode === "FULL" ? null : text(form, "depositRp"), depositDueDate: text(form, "depositDueDate") || null, balanceDueDate: text(form, "balanceDueDate") || null, ...(text(form, "reason") ? { reason: text(form, "reason") } : {}), ...(text(form, "settingsVersion") ? { settingsVersion: Number(form.get("settingsVersion")), idempotencyKey: text(form, "idempotencyKey") } : {}) });
    refresh(inquiryId); return { status: "success", message: "Pola pembayaran B2B berhasil disimpan." };
  } catch (error) { return { status: "error", message: toAppErrorLogged(error, { boundary: "action:finance.b2b.terms" }).message }; }
};
export const recordB2BTransferAction: AdminAction = async (_previous, form) => {
  try {
    await new ManualPaymentService().record(await requireAdmin(), { billingCaseId: text(form, "billingCaseId"), expectedVersion: Number(form.get("expectedVersion")), amountRp: text(form, "amountRp"), receivedDate: text(form, "receivedDate"), reference: text(form, "reference"), note: text(form, "note"), confirmed: text(form, "confirmed") === "confirmed", idempotencyKey: text(form, "idempotencyKey") });
    refresh(text(form, "inquiryId")); return { status: "success", message: "Transfer terkonfirmasi berhasil dicatat.", link: `/admin/inquiries/${text(form, "inquiryId")}/billing` };
  } catch (error) { return { status: "error", message: toAppErrorLogged(error, { boundary: "action:finance.b2b.transfer" }).message }; }
};
