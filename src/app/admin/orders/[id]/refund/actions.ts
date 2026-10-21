"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/admin";
import { toAppErrorLogged } from "@/lib/observability/report";
import { createRuntimeRateLimiter } from "@/lib/security/shared-rate-limit";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { refundFormValues } from "@/modules/refund/form-values";
import { RefundService } from "@/modules/refund/service";
import { RefundExecutionService } from "@/modules/refund/execution-service";
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
const executionOperation = z.enum(["submit", "reconcile", "authorize-manual", "confirm-manual", "revoke-manual"]);
const executionLimiter = createRuntimeRateLimiter({ namespace: "admin-refund-execution", limit: 10, maxKeys: 256, windowMs: 10 * 60_000 });
export async function executeRefundAction(orderId: string, operation: z.infer<typeof executionOperation>, _state: RefundFormState, data: FormData): Promise<RefundFormState> {
  try {
    const access = await requireAdmin(), selected = parseWithValidation(executionOperation, operation);
    requireAdminPermission(access, "PAYMENT_REFUND_FULL");
    if (!(await executionLimiter.check(access.profile.id)).allowed) throw appError("RATE_LIMITED");
    const service = new RefundExecutionService({ authorizeAdmin: async () => access });
    const base = { orderId, expectedVersion: Number(data.get("expectedVersion")), submissionKey: data.get("submissionKey") };
    if (selected === "submit") await service.submit({ ...base, allocationId: data.get("allocationId"), publicReason: data.get("publicReason"), eligibilityEvidence: data.get("eligibilityEvidence") });
    else if (selected === "authorize-manual") await service.authorizeManual({ ...base, reason: data.get("reason"), providerConfirmedNoPending: data.get("providerConfirmedNoPending") === "true", providerResolutionReference: data.get("providerResolutionReference"), recipientVerificationReference: data.get("recipientVerificationReference") });
    else if (selected === "revoke-manual") await service.revokeManual({ ...base, authorizationId: data.get("authorizationId"), reason: data.get("reason") });
    else if (selected === "confirm-manual") {
      const local = data.get("paidAt");
      const paidAt = typeof local === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(local) ? `${local.length === 16 ? `${local}:00` : local}+07:00` : local;
      await service.confirmManual({ ...base, authorizationId: data.get("authorizationId"), transferReference: data.get("transferReference"), evidenceReference: data.get("evidenceReference"), paidAt });
    } else await service.reconcile(orderId);
    revalidatePath(`/admin/orders/${orderId}/refund`); revalidatePath(`/account/orders/${orderId}/refund`); revalidatePath(`/admin/orders/${orderId}`);
    return { status: "success", message: "Pemeriksaan tercatat. Lihat status setiap alokasi dan riwayat bukti di bawah." };
  } catch (error) {
    const executionValues = Object.fromEntries(["publicReason", "reason", "eligibilityEvidence", "providerResolutionReference", "recipientVerificationReference", "providerConfirmedNoPending", "transferReference", "evidenceReference", "paidAt"].map(name => [name, typeof data.get(name) === "string" ? String(data.get(name)).slice(0, 1000) : ""]));
    return { status: "error", message: toAppErrorLogged(error, { boundary: "action:refund.execution" }).message, executionValues };
  }
}
