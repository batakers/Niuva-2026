"use server";
import { revalidatePath, updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { toAppErrorLogged } from "@/lib/observability/report";
import { SiteInformationService } from "@/modules/site-information/service";
import { SITE_INFORMATION_TAG } from "@/modules/site-information/public-reader";
import type { SiteInformationActionState } from "@/modules/site-information/types";
export async function publishSiteInformationAction(_previous: SiteInformationActionState, formData: FormData): Promise<SiteInformationActionState> {
  try {
    const raw = formData.get("payload");
    if (typeof raw !== "string" || raw.length > 12_000) return { status: "error", message: "Informasi situs tidak valid." };
    let input: unknown;
    try { input = JSON.parse(raw); } catch { return { status: "error", message: "Informasi situs tidak valid." }; }
    const published = await new SiteInformationService().publish(await requireAdmin(), input);
    updateTag(SITE_INFORMATION_TAG);
    revalidatePath("/", "layout");
    return { status: "success", version: published.version, message: "Informasi situs berhasil diterbitkan." };
  } catch (error) { return { status: "error", message: toAppErrorLogged(error, { boundary: "action:site-information.publish" }).message }; }
}
