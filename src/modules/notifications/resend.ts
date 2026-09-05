import { validateStartupEnvironment } from "@/lib/env/server";
import type { CustomPrintNotificationScheduler } from "@/modules/custom-print/service";
import type { InquiryNotificationScheduler } from "@/modules/inquiry/service";
import { assertNonProductionProvider } from "@/modules/providers/non-production";
import { appError } from "@/modules/shared/errors";

const RESEND_EMAILS_ENDPOINT = "https://api.resend.com/emails";

export type ResendEmailInput = Readonly<{
  idempotencyKey: string;
  subject: string;
  text: string;
  to: string;
}>;

export type ResendEmailResult = Readonly<{ id: string }>;

export type ResendEmailGatewayConfig = Readonly<{
  apiKey: string;
  from: string;
  endpoint?: string;
  fetch?: typeof fetch;
}>;

export class ResendEmailGateway {
  private readonly endpoint: string;
  private readonly fetchImplementation: typeof fetch;

  constructor(private readonly config: ResendEmailGatewayConfig) {
    this.endpoint = config.endpoint ?? RESEND_EMAILS_ENDPOINT;
    this.fetchImplementation = config.fetch ?? fetch;
  }

  async send(input: ResendEmailInput): Promise<ResendEmailResult> {
    const response = await this.fetchImplementation(this.endpoint, {
      body: JSON.stringify({
        from: this.config.from,
        subject: input.subject,
        text: input.text,
        to: [input.to],
      }),
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      method: "POST",
    });

    if (!response.ok) {
      throw appError("PROVIDER_UNAVAILABLE", {
        message: "Layanan email sedang tidak tersedia.",
      });
    }

    const responseBody: unknown = await response.json().catch(() => null);

    if (
      responseBody === null ||
      typeof responseBody !== "object" ||
      Array.isArray(responseBody)
    ) {
      throw appError("PROVIDER_UNAVAILABLE", {
        message: "Layanan email memberi respons yang tidak valid.",
      });
    }

    const responseRecord = responseBody as Readonly<Record<string, unknown>>;

    if (
      typeof responseRecord.id !== "string" ||
      responseRecord.id.trim().length === 0
    ) {
      throw appError("PROVIDER_UNAVAILABLE", {
        message: "Layanan email memberi respons yang tidak valid.",
      });
    }

    return { id: responseRecord.id };
  }
}

export function createInquiryAdminNotificationFromEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
): InquiryNotificationScheduler | undefined {
  const adminEmail = createAdminEmailGateway(source);

  if (adminEmail === undefined) {
    return undefined;
  }

  return async ({ inquiryId, referenceNumber }) => {
    await adminEmail.gateway.send({
      idempotencyKey: `admin-inquiry:${inquiryId}`,
      subject: `Niuva: brief baru ${referenceNumber}`,
      text: [
        `Ada project brief baru dengan referensi ${referenceNumber}.`,
        "Buka Action Queue admin untuk meninjau detailnya.",
      ].join("\n\n"),
      to: adminEmail.to,
    });
  };
}

export function createCustomPrintAdminNotificationFromEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
): CustomPrintNotificationScheduler | undefined {
  const adminEmail = createAdminEmailGateway(source);

  if (adminEmail === undefined) {
    return undefined;
  }

  return async ({ referenceNumber, requestId }) => {
    await adminEmail.gateway.send({
      idempotencyKey: `admin-custom-print:${requestId}`,
      subject: `Niuva: custom print baru ${referenceNumber}`,
      text: [
        `Ada request custom print baru dengan referensi ${referenceNumber}.`,
        "Buka Action Queue admin untuk meninjau file dan kebutuhan produksinya.",
      ].join("\n\n"),
      to: adminEmail.to,
    });
  };
}

function createAdminEmailGateway(
  source: Readonly<Record<string, string | undefined>>,
): Readonly<{ gateway: ResendEmailGateway; to: string }> | undefined {
  const environment = validateStartupEnvironment(source);
  const adminNotificationEmail = environment.ADMIN_NOTIFICATION_EMAIL;
  const emailFrom = environment.EMAIL_FROM;
  const resendApiKey = environment.RESEND_API_KEY;

  if (
    adminNotificationEmail === undefined ||
    emailFrom === undefined ||
    resendApiKey === undefined
  ) {
    return undefined;
  }

  assertNonProductionProvider({
    nodeEnv: environment.NODE_ENV,
    provider: "Resend",
  });

  return {
    gateway: new ResendEmailGateway({
      apiKey: resendApiKey,
      from: emailFrom,
    }),
    to: adminNotificationEmail,
  };
}
