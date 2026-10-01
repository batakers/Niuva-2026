import { isCustomerEmailTestRuntime } from "./email-test-runtime";
// Owner-provided documents are required. Never replace these with invented policy.
export type CustomerAuthLegalDocuments = Readonly<{
  terms: { href: string; version: string };
  privacy: { href: string; version: string };
}>;
export function getCustomerAuthLegalDocuments(): CustomerAuthLegalDocuments | null {
  if (isCustomerEmailTestRuntime()) return {
    terms: { href: "/auth-test-policy?document=terms", version: "TEST-FIXTURE-TERMS-1" },
    privacy: { href: "/auth-test-policy?document=privacy", version: "TEST-FIXTURE-PRIVACY-1" },
  };
  return null;
}
