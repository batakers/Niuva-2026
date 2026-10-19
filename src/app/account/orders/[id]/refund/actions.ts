"use server";

import { revalidatePath } from "next/cache";
import { requireCustomer } from "@/lib/auth/customer";
import { toAppErrorLogged } from "@/lib/observability/report";
import { createRuntimeRateLimiter } from "@/lib/security/shared-rate-limit";
import { refundFormValues } from "@/modules/refund/form-values";
import { RefundService } from "@/modules/refund/service";
import type { RefundFormState } from "@/modules/refund/types";
import { appError } from "@/modules/shared/errors";

const limiter = createRuntimeRateLimiter({ namespace: "customer-refund-request", limit: 10, maxKeys: 256, windowMs: 10 * 60_000 });
export async function requestRefundAction(orderId: string, _state: RefundFormState, data: FormData): Promise<RefundFormState> {
  try {
    const customer = await requireCustomer(), rate = await limiter.check(customer.id);
    if (!rate.allowed) throw appError("RATE_LIMITED");
    await new RefundService().request(customer.id, { orderId, submissionKey: data.get("submissionKey"), category: data.get("category"), reason: data.get("reason") });
    revalidatePath(`/account/orders/${orderId}/refund`); revalidatePath(`/admin/orders/${orderId}/refund`);
    return { status: "success", message: "Pengajuan tersimpan. Gunakan nomor kasus yang sama untuk tindak lanjut." };
  } catch (error) { return { status: "error", message: toAppErrorLogged(error, { boundary: "action:refund.request" }).message, values: refundFormValues(data) }; }
}
