import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { buildCustomerAuthLink } from "./app-origin";
import { isCustomerEmailTestRuntime } from "./email-test-runtime";
import { parseServerEnvironment } from "@/lib/env/server";
import { requireAllowed, type CapabilityContext } from "@/modules/capabilities/resolver";
import { ResendEmailGateway } from "@/modules/notifications/resend";
import { assertNonProductionProvider } from "@/modules/providers/non-production";
import { appError } from "@/modules/shared/errors";
import { assertInternalEmail, getInternalAuthConfig, isInternalAuthDatabase } from "./internal-testing";
export type CustomerAuthMailer = { send: (input: { to: string; token: string; purpose: "verify" | "reset"; returnTo: string; idempotencyKey: string }) => Promise<void> };
export type CustomerAuthMailerCapabilityConfig = Readonly<{
  apiKey: string;
  /** Caller-owned capability inputs; never read from process.env implicitly. */
  capabilityEnv?: Readonly<Record<string, string | undefined>>;
  from: string;
  gates?: CapabilityContext["gates"];
  hasActivationGrant?: CapabilityContext["hasActivationGrant"];
  nodeEnv?: "development" | "production" | "test";
}>;
/** Builds the resolver context for `emailSender` from the caller's configuration. */
export function buildCustomerAuthMailerCapabilityContext(config: CustomerAuthMailerCapabilityConfig): CapabilityContext {
  const caller = config.capabilityEnv ?? {};
  const apiKey = config.apiKey.trim();
  const from = config.from.trim();
  const env: Record<string, string | undefined> = {
    DATABASE_URL: caller.DATABASE_URL,
    EMAIL_FROM: from.length > 0 ? from : undefined,
    NIUVA_DEPLOYMENT_TIER: caller.NIUVA_DEPLOYMENT_TIER,
    NIUVA_PROVIDER_MODE: caller.NIUVA_PROVIDER_MODE,
    NODE_ENV: config.nodeEnv ?? caller.NODE_ENV,
    RESEND_API_KEY: apiKey.length > 0 ? apiKey : undefined,
  };
  return { env, ...(config.gates === undefined ? {} : { gates: config.gates }), ...(config.hasActivationGrant === undefined ? {} : { hasActivationGrant: config.hasActivationGrant }) };
}
/** Legacy production rejection first (resolver can only tighten), then the resolver. */
export function assertCustomerAuthMailerAllowed(config: CustomerAuthMailerCapabilityConfig): void {
  assertNonProductionProvider({
    nodeEnv: config.nodeEnv === "production" || config.capabilityEnv?.NODE_ENV === "production" ? "production" : config.nodeEnv,
    provider: "Resend Customer auth",
  });
  requireAllowed("emailSender", buildCustomerAuthMailerCapabilityContext(config));
}
export function createCustomerAuthMailer(source: Readonly<Record<string, string | undefined>> = process.env): CustomerAuthMailer | null {
  if (isCustomerEmailTestRuntime(source)) return { async send(input) {
    await mkdir(join(process.cwd(), "test-results"), { recursive: true });
    await appendFile(join(process.cwd(), "test-results", "customer-email-test-outbox.jsonl"), JSON.stringify({ ...input, fixture: true }) + "\n");
  } };
  const env = parseServerEnvironment(source);
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.APP_URL || env.NODE_ENV === "production") return null;
  // Local Customer mail may only reach the configured participant. Missing or
  // invalid internal config cannot accidentally activate an unrestricted sender.
  if (isInternalAuthDatabase() && !getInternalAuthConfig()) return null;

  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;
  const gateway = new ResendEmailGateway({ apiKey, from, fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(10000) }) });
  return { async send(input) {
    assertCustomerAuthMailerAllowed({ apiKey, capabilityEnv: source, from, nodeEnv: env.NODE_ENV });
    if (getInternalAuthConfig() || isInternalAuthDatabase()) assertInternalEmail(input.to, "password");
    // Canonical origin for the active tier, resolved after the capability
    // gate; an invalid origin throws before any link is built or sent.
    const url = buildCustomerAuthLink(source, input.purpose, input.token);
    if (url === null) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
    await gateway.send({ to: input.to, idempotencyKey: input.idempotencyKey,
      subject: input.purpose === "verify" ? "Verifikasi email akun Niuva Anda" : "Atur ulang password Niuva Anda",
      text: `${input.purpose === "verify" ? "Verifikasi alamat email Anda untuk menyelesaikan pendaftaran akun Niuva. Tautan berlaku 24 jam." : "Gunakan tautan berikut untuk mengatur ulang password. Tautan berlaku 30 menit."}\n\n${url.href}\n\nJika Anda tidak meminta tindakan ini, abaikan email ini.` });
  } };
}
