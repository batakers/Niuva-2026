"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { toAppErrorLogged } from "@/lib/observability/report";
import type { AdminAction } from "@/app/admin/actions";
import { BillingSettingsService } from "@/modules/finance/billing-settings-service";
export const saveBillingSettingsAction: AdminAction = async (_previous, form) => {
  try {
    const values = Object.fromEntries(["issuerName", "issuerAddress", "issuerEmail", "bankName", "accountName", "accountNumber", "transferInstructions"].map(key => [key, form.get(key)]));
    await new BillingSettingsService().save(await requireAdmin(), { expectedVersion: Number(form.get("expectedVersion")), values });
    revalidatePath("/admin/finance/settings"); revalidatePath("/admin/finance/invoices");
    return { status: "success", message: "Identitas penerbit dan rekening berhasil disimpan. Invoice yang sudah terbit memakai instruksi sebelumnya." };
  } catch (error) { return { status: "error", message: toAppErrorLogged(error, { boundary: "action:finance.settings.save" }).message }; }
};
