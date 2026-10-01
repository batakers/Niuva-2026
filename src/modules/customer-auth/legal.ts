import { isCustomerEmailTestRuntime } from "./email-test-runtime";
import { getInternalAuthConfig, INTERNAL_TERMS_VERSION, INTERNAL_PRIVACY_VERSION } from "./internal-testing";
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
  if (isCustomerEmailTestRuntime()) return {
    terms: { href: "/auth-test-policy?document=terms", version: "TEST-FIXTURE-TERMS-1" },
    privacy: { href: "/auth-test-policy?document=privacy", version: "TEST-FIXTURE-PRIVACY-1" },
  };
  return null;
}
