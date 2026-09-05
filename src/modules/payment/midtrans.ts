import { createHash, timingSafeEqual } from "node:crypto";

import { z } from "zod";

import { validateStartupEnvironment } from "@/lib/env/server";
import type { CheckoutPaymentProvider } from "@/modules/checkout/service";
import { assertNonProductionProvider } from "@/modules/providers/non-production";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";

const MIDTRANS_SANDBOX_SNAP_ENDPOINT =
  "https://app.sandbox.midtrans.com/snap/v1/transactions";

const midtransNotificationSchema = z.object({
  fraud_status: z.enum(["accept", "challenge", "deny"]).optional(),
  gross_amount: z.string().trim().regex(/^\d+(?:\.\d{1,2})?$/),
  order_id: z.string().trim().min(1).max(64),
  signature_key: z.string().trim().regex(/^[0-9a-f]{128}$/i),
  status_code: z.string().trim().regex(/^\d{3}$/),
  transaction_id: z.string().trim().min(1).max(128).optional(),
  transaction_status: z.enum([
    "authorize",
    "cancel",
    "capture",
    "chargeback",
    "deny",
    "expire",
    "failure",
    "partial_refund",
    "pending",
    "refund",
    "settlement",
  ]),
});

export type MidtransNotification = Readonly<{
  fraudStatus?: "accept" | "challenge" | "deny";
  grossAmount: string;
  orderId: string;
  signatureKey: string;
  statusCode: string;
  transactionId?: string;
  transactionStatus:
    | "authorize"
    | "cancel"
    | "capture"
    | "chargeback"
    | "deny"
    | "expire"
    | "failure"
    | "partial_refund"
    | "pending"
    | "refund"
    | "settlement";
}>;

export type MidtransPaymentStatus =
  | "EXPIRED"
  | "FAILED"
  | "PENDING"
  | "REFUNDED"
  | "SETTLED";

export type MidtransSnapGatewayConfig = Readonly<{
  endpoint?: string;
  fetch?: typeof fetch;
  isProduction: boolean;
  nodeEnv?: "development" | "production" | "test";
  now?: () => Date;
  serverKey: string;
}>;

export class MidtransSnapGateway implements CheckoutPaymentProvider {
  private readonly endpoint: string;
  private readonly fetchImplementation: typeof fetch;
  private readonly now: () => Date;

  constructor(private readonly config: MidtransSnapGatewayConfig) {
    this.endpoint = config.endpoint ?? MIDTRANS_SANDBOX_SNAP_ENDPOINT;
    this.fetchImplementation = config.fetch ?? fetch;
    this.now = config.now ?? (() => new Date());
  }

  async createPayment(input: Readonly<{
    amountRp: string;
    expiresAt: Date;
    orderId: string;
    orderNumber: string;
    providerOrderId: string;
  }>): Promise<Readonly<{ redirectUrl?: string; token?: string }>> {
    assertNonProductionProvider({
      isLiveProvider: this.config.isProduction,
      nodeEnv: this.config.nodeEnv,
      provider: "Midtrans",
    });

    const grossAmount = parseSnapGrossAmount(input.amountRp);
    assertProviderOrderId(input.providerOrderId);
    const now = this.now();
    const expiry = buildSnapExpiry(now, input.expiresAt);
    const credential = Buffer.from(`${this.config.serverKey}:`, "utf8").toString(
      "base64",
    );

    let response: Response;
    try {
      response = await this.fetchImplementation(this.endpoint, {
        body: JSON.stringify({
          expiry,
          transaction_details: {
            gross_amount: grossAmount,
            order_id: input.providerOrderId,
          },
        }),
        headers: {
          Authorization: `Basic ${credential}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });
    } catch {
      throw appError("PROVIDER_UNAVAILABLE", {
        message: "Layanan pembayaran sedang tidak tersedia.",
      });
    }

    if (!response.ok) {
      throw appError("PROVIDER_UNAVAILABLE", {
        message: "Layanan pembayaran sedang tidak tersedia.",
      });
    }

    const body: unknown = await response.json().catch(() => null);

    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      throw appError("PROVIDER_UNAVAILABLE", {
        message: "Layanan pembayaran memberi respons yang tidak valid.",
      });
    }

    const responseBody = body as Readonly<Record<string, unknown>>;
    const token = responseBody.token;
    const redirectUrl = responseBody.redirect_url;

    if (typeof token !== "string" || token.trim().length === 0) {
      throw appError("PROVIDER_UNAVAILABLE", {
        message: "Layanan pembayaran tidak memberi token pembayaran.",
      });
    }

    return {
      token,
      ...(typeof redirectUrl === "string" && redirectUrl.trim().length > 0
        ? { redirectUrl }
        : {}),
    };
  }
}

export function createMidtransSnapGatewayFromEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
): CheckoutPaymentProvider {
  const environment = validateStartupEnvironment(source);

  if (
    environment.MIDTRANS_IS_PRODUCTION === undefined ||
    environment.MIDTRANS_SERVER_KEY === undefined ||
    environment.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY === undefined
  ) {
    throw appError("PROVIDER_UNAVAILABLE", {
      message: "Midtrans belum dikonfigurasi.",
    });
  }

  assertNonProductionProvider({
    isLiveProvider: environment.MIDTRANS_IS_PRODUCTION,
    nodeEnv: environment.NODE_ENV,
    provider: "Midtrans",
  });

  return new MidtransSnapGateway({
    isProduction: environment.MIDTRANS_IS_PRODUCTION,
    nodeEnv: environment.NODE_ENV,
    serverKey: environment.MIDTRANS_SERVER_KEY,
  });
}

export function parseMidtransNotification(input: unknown): MidtransNotification {
  const parsed = parseWithValidation(midtransNotificationSchema, input);

  return {
    fraudStatus: parsed.fraud_status,
    grossAmount: parsed.gross_amount,
    orderId: parsed.order_id,
    signatureKey: parsed.signature_key,
    statusCode: parsed.status_code,
    transactionId: parsed.transaction_id,
    transactionStatus: parsed.transaction_status,
  };
}

export function verifyMidtransNotificationSignature(
  notification: MidtransNotification,
  serverKey: string,
): void {
  if (serverKey.trim().length === 0) {
    throw appError("PROVIDER_UNAVAILABLE", {
      message: "Midtrans belum dikonfigurasi.",
    });
  }

  const expected = createHash("sha512")
    .update(
      `${notification.orderId}${notification.statusCode}${notification.grossAmount}${serverKey}`,
      "utf8",
    )
    .digest();
  const received = Buffer.from(notification.signatureKey, "hex");

  if (
    received.length !== expected.length ||
    !timingSafeEqual(received, expected)
  ) {
    throw appError("PAYMENT_VERIFICATION_FAILED", {
      message: "Notifikasi pembayaran tidak dapat diverifikasi.",
    });
  }
}

export function createMidtransEventFingerprint(
  notification: MidtransNotification,
): string {
  return createHash("sha256")
    .update(
      [
        "MIDTRANS",
        notification.orderId,
        notification.transactionId ?? "",
        notification.transactionStatus,
        notification.statusCode,
        notification.grossAmount,
        notification.fraudStatus ?? "",
      ].join("\u0000"),
      "utf8",
    )
    .digest("hex");
}

export function getMidtransPaymentStatus(
  notification: MidtransNotification,
): MidtransPaymentStatus {
  switch (notification.transactionStatus) {
    case "settlement":
      return "SETTLED";
    case "capture":
      return notification.fraudStatus === "accept" ? "SETTLED" : "PENDING";
    case "cancel":
    case "chargeback":
    case "deny":
    case "failure":
      return "FAILED";
    case "expire":
      return "EXPIRED";
    case "partial_refund":
    case "refund":
      return "REFUNDED";
    case "authorize":
    case "pending":
      return "PENDING";
  }
}

function parseSnapGrossAmount(amountRp: string): number {
  if (!/^\d+$/.test(amountRp)) {
    throw appError("VALIDATION_ERROR", {
      details: { amountRp: "Nominal Midtrans harus rupiah bulat positif." },
    });
  }

  const amount = Number(amountRp);

  if (!Number.isSafeInteger(amount) || amount < 1) {
    throw appError("VALIDATION_ERROR", {
      details: { amountRp: "Nominal Midtrans di luar batas aman." },
    });
  }

  return amount;
}

function assertProviderOrderId(providerOrderId: string): void {
  if (!/^[A-Za-z0-9._-]{1,50}$/.test(providerOrderId)) {
    throw appError("VALIDATION_ERROR", {
      details: { providerOrderId: "Referensi pembayaran tidak valid." },
    });
  }
}

function buildSnapExpiry(now: Date, expiresAt: Date): Readonly<{
  duration: number;
  start_time: string;
  unit: "minutes";
}> {
  const nowTimestamp = now.getTime();
  const expiryTimestamp = expiresAt.getTime();

  if (
    !Number.isFinite(nowTimestamp) ||
    !Number.isFinite(expiryTimestamp) ||
    expiryTimestamp <= nowTimestamp
  ) {
    throw appError("CONFLICT", {
      message: "Batas waktu pembayaran sudah tidak berlaku.",
    });
  }

  const duration = Math.floor((expiryTimestamp - nowTimestamp) / 60_000);

  if (duration < 1) {
    throw appError("CONFLICT", {
      message: "Sisa waktu pembayaran terlalu singkat untuk membuat transaksi.",
    });
  }

  return {
    duration,
    start_time: formatJakartaTime(now),
    unit: "minutes",
  };
}

function formatJakartaTime(value: Date): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone: "Asia/Jakarta",
    year: "numeric",
  }).formatToParts(value);
  const values = new Map(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );

  return `${values.get("year")}-${values.get("month")}-${values.get("day")} ${values.get("hour")}:${values.get("minute")}:${values.get("second")} +0700`;
}
