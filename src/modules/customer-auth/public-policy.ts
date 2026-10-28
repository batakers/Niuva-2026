export type PolicyPublication = Readonly<{ publishedAt: string | null; effectiveAt: string | null }>;

// Owner approved the public text on 28 October (content of 24 October without
// internal review notes, current providers and 28 October decisions), without
// legal-counsel review. Publication dates are a separate Owner act.
export const PUBLIC_CUSTOMER_POLICY = Object.freeze({
  ownerApprovedAt: "2026-10-28",
  ownerApprovalReference: "TASKS.md#keputusan-owner-untuk-staging-2026-10-28",
  approvedSourceRevision: "d7dd2d663f427246dfbbb630c1f54e635af40531",
  language: "id",
  publishedAt: null,
  effectiveAt: null,
  terms: Object.freeze({
    version: "NIUVA-TERMS-v1.0",
    contentReference: "src/content/customer-policy/terms-v1.0.md",
    sha256: "33bfd51aca55983c70bcfa1975700f35366761be898c1ecbb19f69f7a2f12635",
  }),
  privacy: Object.freeze({
    version: "NIUVA-PRIVACY-v1.0",
    contentReference: "src/content/customer-policy/privacy-v1.0.md",
    sha256: "ffba93ca18a34af1f4aefd3021f9f8c157571133bbfab704da36677ab355f68c",
  }),
});

/**
 * PUB-POLICY closes only after the Owner records an actual publication: both
 * ISO timestamps set, publication not after the effective time, and the
 * effective time reached. Setting the dates is the publication act itself.
 */
export function isPolicyPublished(policy: PolicyPublication = PUBLIC_CUSTOMER_POLICY, now: number = Date.now()): boolean {
  if (policy.publishedAt === null || policy.effectiveAt === null) return false;
  const published = Date.parse(policy.publishedAt);
  const effective = Date.parse(policy.effectiveAt);

  return Number.isFinite(published) && Number.isFinite(effective) && published <= effective && effective <= now;
}
