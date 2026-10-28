import { isCustomerEmailTestRuntime, isCustomerPublicAuthTestRuntime } from "./email-test-runtime";
import { getInternalAuthConfig, INTERNAL_TERMS_VERSION, INTERNAL_PRIVACY_VERSION } from "./internal-testing";
import { isPolicyPublished, PUBLIC_CUSTOMER_POLICY } from "./public-policy";
import { getStagingCustomerTesters } from "./staging-testers";
import { appError } from "../shared/errors";
import { assertRecordedAgeDeclaration, type RecordedAgeDeclaration } from "./age-declaration";
// Owner-provided documents are required. Never replace these with invented policy.
export type CustomerAuthLegalDocuments = Readonly<{
  terms: { href: string; version: string; label?: string };
  privacy: { href: string; version: string; label?: string };
}>;
export function getCustomerAuthLegalDocuments(): CustomerAuthLegalDocuments | null {
  if (getInternalAuthConfig()) return {
    terms: { href: "/internal-testing/policy?document=terms", version: INTERNAL_TERMS_VERSION, label: "Ketentuan Pengujian Internal" },
    privacy: { href: "/internal-testing/policy?document=privacy", version: INTERNAL_PRIVACY_VERSION, label: "Pemberitahuan Privasi Pengujian" },
  };
  const publicDocuments = getPublicCustomerAuthLegalDocuments();
  if (publicDocuments) return publicDocuments;
  const stagingDocuments = getStagingCustomerAuthLegalDocuments();
  if (stagingDocuments) return stagingDocuments;
  // A misconfigured public fixture must not fall back to another consent scope.
  if (process.env.NIUVA_CUSTOMER_PUBLIC_AUTH_TEST === "true") return null;
  if (isCustomerEmailTestRuntime()) return {
    terms: { href: "/auth-test-policy?document=terms", version: "TEST-FIXTURE-TERMS-1" },
    privacy: { href: "/auth-test-policy?document=privacy", version: "TEST-FIXTURE-PRIVACY-1" },
  };
  return null;
}

export function getPublicCustomerAuthLegalDocuments(): CustomerAuthLegalDocuments | null {
  if (!isCustomerPublicAuthTestRuntime()) return null;
  return {
    terms: { href: "/auth-test-policy?document=terms", version: PUBLIC_CUSTOMER_POLICY.terms.version },
    privacy: { href: "/auth-test-policy?document=privacy", version: PUBLIC_CUSTOMER_POLICY.privacy.version },
  };
}

/** Staging testers (E1) consent to the published v1.0 policy; nothing before publication. */
export function getStagingCustomerAuthLegalDocuments(
  source: Readonly<Record<string, string | undefined>> = process.env,
): CustomerAuthLegalDocuments | null {
  if (!getStagingCustomerTesters(source) || !isPolicyPublished()) return null;
  return {
    terms: { href: "/terms", version: PUBLIC_CUSTOMER_POLICY.terms.version },
    privacy: { href: "/privacy", version: PUBLIC_CUSTOMER_POLICY.privacy.version },
  };
}

export function assertPresentedPolicyVersions(input: { termsVersion?: string; privacyVersion?: string }, legal: CustomerAuthLegalDocuments): void {
  const official = legal.terms.version === PUBLIC_CUSTOMER_POLICY.terms.version || legal.privacy.version === PUBLIC_CUSTOMER_POLICY.privacy.version;
  if ((official || input.termsVersion !== undefined || input.privacyVersion !== undefined)
    && (input.termsVersion !== legal.terms.version || input.privacyVersion !== legal.privacy.version)) {
    throw appError("CUSTOMER_AUTH_UNAVAILABLE");
  }
}

export function assertCustomerPolicyAcceptance(
  record: RecordedAgeDeclaration & { termsVersion: string; privacyVersion: string; acceptedAt: Date },
  now: Date,
  internalTest: boolean,
  legal: CustomerAuthLegalDocuments | null = getCustomerAuthLegalDocuments(),
): void {
  if (!legal || record.termsVersion !== legal.terms.version || record.privacyVersion !== legal.privacy.version
    || internalTest !== (record.termsVersion === INTERNAL_TERMS_VERSION && record.privacyVersion === INTERNAL_PRIVACY_VERSION)
    || !Number.isFinite(record.acceptedAt.getTime()) || record.acceptedAt > now) throw appError("CUSTOMER_AUTH_UNAVAILABLE");
  assertRecordedAgeDeclaration(record, now);
}
