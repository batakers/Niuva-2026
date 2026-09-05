import { readJsonBody } from "@/lib/http/body";
import {
  apiError,
  apiSuccess,
  createCorrelationId,
} from "@/lib/http/response";
import { PaymentWebhookService } from "@/modules/payment/webhook-service";

export const runtime = "nodejs";

const MIDTRANS_WEBHOOK_MAX_BODY_BYTES = 64 * 1_024;

export async function POST(request: Request) {
  const correlationId = createCorrelationId();

  try {
    const payload = await readJsonBody(request, {
      maxBytes: MIDTRANS_WEBHOOK_MAX_BODY_BYTES,
    });
    const result = await new PaymentWebhookService().handleMidtransNotification(
      payload,
    );

    return apiSuccess(
      { ok: true, outcome: result.kind },
      { correlationId },
    );
  } catch (error) {
    return apiError(error, correlationId);
  }
}
