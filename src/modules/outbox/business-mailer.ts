import { parseServerEnvironment } from "@/lib/env/server";
import { requireAllowed } from "../capabilities/resolver";
import { resolveCustomerAppOrigin } from "../customer-auth/app-origin";
import { buildCustomerAuthMailerCapabilityContext } from "../customer-auth/email-mailer";
import { assertInternalEmail, getInternalAuthConfig, isInternalAuthDatabase } from "../customer-auth/internal-testing";
import { assertStagingCustomerTester, getStagingCustomerTesters } from "../customer-auth/staging-testers";
import { readExplicitDeploymentTier } from "@/lib/env/deployment";
import { ResendEmailGateway } from "../notifications/resend";
import type { PreparedCustomerEmail } from "../notifications/email-delivery";
import { assertNonProductionProvider } from "../providers/non-production";
import { appError } from "../shared/errors";
import { businessEnvelope, type BusinessContent, type BusinessPurpose } from "./business-core";

export type BusinessMail = { to: string; purpose: BusinessPurpose; content: BusinessContent; idempotencyKey: string };
export type BusinessMailer = { prepare(input: BusinessMail): PreparedCustomerEmail };
export function createBusinessMailer(raw: Readonly<Record<string, string | undefined>>): BusinessMailer | null {
  const source = Object.freeze({ ...raw }), env = parseServerEnvironment(source), resolved = resolveCustomerAppOrigin(source);
  const deploymentTier = readExplicitDeploymentTier(source), staging = deploymentTier === "staging";
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !resolved.ok || env.NODE_ENV === "production" && !staging) return null;
  const internal = getInternalAuthConfig(source);
  if (isInternalAuthDatabase(source) && !internal) return null;
  // Staging business mail reaches only the listed testers (E1).
  const testers = getStagingCustomerTesters(source);
  if (staging && !testers) return null;
  const apiKey = env.RESEND_API_KEY, from = env.EMAIL_FROM, appOrigin = resolved.origin;
  const check = (to: string) => {
    assertNonProductionProvider({ deploymentTier, nodeEnv: env.NODE_ENV, provider: "Resend email bisnis" });
    requireAllowed("emailSender", buildCustomerAuthMailerCapabilityContext({ apiKey, from, capabilityEnv: source, nodeEnv: env.NODE_ENV }));
    if (internal) {
      let allowed = false;
      for (const method of ["password", "google"] as const) { try { assertInternalEmail(to, method, internal); allowed = true; } catch {} }
      if (!allowed) throw appError("PROVIDER_UNAVAILABLE");
    }
    if (staging) {
      try { assertStagingCustomerTester(to, testers); } catch { throw appError("PROVIDER_UNAVAILABLE"); }
    }
  };
  return { prepare(input) {
    check(input.to);
    const envelope = businessEnvelope({ from, to: input.to, appOrigin, purpose: input.purpose, content: input.content });
    return { envelope, async send(saved, idempotencyKey, signal) {
      check(input.to);
      if (saved.to !== input.to) throw appError("PROVIDER_UNAVAILABLE");
      return new ResendEmailGateway({ apiKey, from: saved.from }).send({ to: saved.to, subject: saved.subject, text: saved.text, idempotencyKey, signal });
    } };
  } };
}
