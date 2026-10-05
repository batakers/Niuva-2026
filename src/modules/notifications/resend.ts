import { validateStartupEnvironment } from "@/lib/env/server";
import {
  requireAllowed,
  type CapabilityContext,
} from "@/modules/capabilities/resolver";
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

export type ResendDeliveryCapabilityConfig = Readonly<{
  apiKey: string;
  /**
   * Caller-owned capability inputs (never read from process.env implicitly).
   * NODE_ENV, NIUVA_DEPLOYMENT_TIER, NIUVA_PROVIDER_MODE and DATABASE_URL are
   * taken from here when present.
   */
  capabilityEnv?: Readonly<Record<string, string | undefined>>;
  /** Set false to declare the database resource unbound (default: bound). */
  databaseBound?: boolean;
  from: string;
  gates?: CapabilityContext["gates"];
  hasActivationGrant?: CapabilityContext["hasActivationGrant"];
  nodeEnv?: "development" | "production" | "test";
}>;

const CALLER_CAPABILITY_KEYS = [
  "DATABASE_URL",
  "NIUVA_DEPLOYMENT_TIER",
  "NIUVA_PROVIDER_MODE",
  "NODE_ENV",
] as const;

function pickCapabilityEnv(
  source: Readonly<Record<string, string | undefined>>,
): Readonly<Record<string, string | undefined>> {
  return Object.fromEntries(
    CALLER_CAPABILITY_KEYS.map((key) => [key, source[key]]),
  );
}

// Non-secret marker for an input this module does not use (it never touches
// the database). It only keeps the resolver resource group evaluable; a caller
// can still declare the database unbound.
const DELIVERY_SCOPE_DATABASE_URL = "postgresql://resend-scope.invalid/none";

/** Builds the resolver context from the caller-provided Resend configuration. */
export function buildResendCapabilityContext(
  config: ResendDeliveryCapabilityConfig,
): CapabilityContext {
  const caller = config.capabilityEnv ?? {};
  const apiKey = config.apiKey.trim();
  const from = config.from.trim();
  const env: Record<string, string | undefined> = {
    DATABASE_URL:
      caller.DATABASE_URL ??
      (config.databaseBound === false ? undefined : DELIVERY_SCOPE_DATABASE_URL),
    EMAIL_FROM: from.length > 0 ? from : undefined,
    NIUVA_DEPLOYMENT_TIER: caller.NIUVA_DEPLOYMENT_TIER,
    NIUVA_PROVIDER_MODE: caller.NIUVA_PROVIDER_MODE,
    NODE_ENV: config.nodeEnv ?? caller.NODE_ENV,
    RESEND_API_KEY: apiKey.length > 0 ? apiKey : undefined,
  };

  return {
    env,
    ...(config.gates === undefined ? {} : { gates: config.gates }),
    ...(config.hasActivationGrant === undefined
      ? {}
      : { hasActivationGrant: config.hasActivationGrant }),
  };
}

/** Legacy production rejection first (resolver can only tighten), then the resolver. */
export function assertResendDeliveryAllowed(
  config: ResendDeliveryCapabilityConfig,
): void {
  assertNonProductionProvider({
    nodeEnv:
      config.nodeEnv === "production" ||
      config.capabilityEnv?.NODE_ENV === "production"
        ? "production"
        : config.nodeEnv,
    provider: "Resend",
  });
  requireAllowed("emailDelivery", buildResendCapabilityContext(config));
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

  assertResendDeliveryAllowed({
    apiKey: resendApiKey,
    capabilityEnv: pickCapabilityEnv(source),
    from: emailFrom,
    nodeEnv: environment.NODE_ENV,
  });

  return {
    gateway: new ResendEmailGateway({
      apiKey: resendApiKey,
      from: emailFrom,
    }),
    to: adminNotificationEmail,
  };
}
