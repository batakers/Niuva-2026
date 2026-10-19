"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { toAppErrorLogged } from "@/lib/observability/report";
import { createRuntimeRateLimiter } from "@/lib/security/shared-rate-limit";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { refundFormValues } from "@/modules/refund/form-values";
import { RefundService } from "@/modules/refund/service";
import type { RefundFormState } from "@/modules/refund/types";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";

const operationSchema = z.enum(["intake", "approve", "refresh", "receive-return"]);
const limiter = createRuntimeRateLimiter({ namespace: "admin-refund-review", limit: 20, maxKeys: 256, windowMs: 10 * 60_000 });
export async function reviewRefundAction(orderId: string, operation: z.infer<typeof operationSchema>, _state: RefundFormState, data: FormData): Promise<RefundFormState> {
  try {
    const access = await requireAdmin(), selected = parseWithValidation(operationSchema, operation);
    requireAdminPermission(access, selected === "intake" ? "FINANCE_WRITE" : "PAYMENT_REFUND_FULL");
    const rate = await limiter.check(access.profile.id);
    if (!rate.allowed) throw appError("RATE_LIMITED");
    const service = new RefundService({ authorizeAdmin: async () => access });
    const base = { orderId, submissionKey: data.get("submissionKey"), reason: data.get("reason") };
    const versioned = { ...base, expectedVersion: Number(data.get("expectedVersion")) };
    const reference = data.get("reference");
    if (selected === "intake") {
      const receivedAt = data.get("receivedAt");
      await service.intake({ ...base, category: data.get("category"), contactVerificationReference: reference,
        receivedAt: typeof receivedAt === "string" ? `${receivedAt}:00+07:00` : receivedAt });
    }
    else if (selected === "approve") await service.approve({ ...versioned, returnState: data.get("returnState"), ...(typeof reference === "string" && reference.trim() ? { returnEvidenceReference: reference } : {}) });
    else if (selected === "refresh") await service.refresh(versioned);
    else await service.receiveReturn({ ...versioned, returnEvidenceReference: reference });
    revalidatePath(`/admin/orders/${orderId}/refund`); revalidatePath(`/account/orders/${orderId}/refund`);
    return { status: "success", message: selected === "approve" ? "Persetujuan Owner tersimpan. Hasil dana tetap perlu diproses dan direkonsiliasi." : "Catatan kasus berhasil diperbarui." };
  } catch (error) { return { status: "error", message: toAppErrorLogged(error, { boundary: "action:refund.review" }).message, values: refundFormValues(data) }; }
}
