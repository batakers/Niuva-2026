"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { toAppErrorLogged } from "@/lib/observability/report";
import { TariffService } from "@/modules/pricing/tariff-service";
export type TariffActionState = { status: "idle" | "error" | "success"; message?: string } | { status: "review"; review: Awaited<ReturnType<TariffService["preview"]>> };
export async function tariffAction(_previous: TariffActionState, form: FormData): Promise<TariffActionState> {
  try {
    const raw = form.get("payload");
    if (typeof raw !== "string" || raw.length > 8192) return { status: "error", message: "Form tarif tidak valid." };
    const input: unknown = JSON.parse(raw); const access = await requireAdmin(); const service = new TariffService();
    if (form.get("phase") === "preview") return { status: "review", review: await service.preview(access, input) };
    if (form.get("phase") !== "apply" || !input || typeof input !== "object" || Array.isArray(input)) return { status: "error", message: "Tinjau perubahan terlebih dahulu." };
    const result = await service.apply(access, { ...input, confirmed: form.get("confirmed") === "on" });
    revalidatePath("/admin/settings/custom-print-rates"); revalidatePath("/admin/custom-print");
    return { status: "success", message: `Tarif versi ${result.version} berlaku untuk perhitungan baru. Quote yang sudah dikirim tetap memakai versi sebelumnya.` };
  } catch (error) { return { status: "error", message: toAppErrorLogged(error, { boundary: "action:tariffs" }).message }; }
}
