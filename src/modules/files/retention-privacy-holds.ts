import type { Prisma } from "../../generated/prisma/client";

export async function retainPrivacyCaseOnFiles(tx: Prisma.TransactionClient, customerId: string, caseId: string) {
  const result = await tx.storedFile.updateMany({ where: {
    bucketScope: "PRIVATE_CUSTOMER", purpose: "CUSTOMER_UPLOAD", uploadStatus: { not: "DELETED" },
    OR: [{ uploadedByCustomerId: customerId }, { customPrintRequestLinks: { some: { request: { customerId } } } }],
    NOT: { retentionPrivacyHoldCaseIds: { has: caseId } },
  }, data: { retentionPrivacyHoldCaseIds: { push: caseId } } });
  if (result.count > 0) await tx.auditLog.create({ data: { actorType: "SYSTEM", entityType: "CUSTOMER_PRIVACY_REQUEST", entityId: caseId,
    action: "file.retention.privacy-hold.preserved", metadataJson: { operation: "preserve-binary-hold", filesAffected: result.count } } });
}

/** Must run under the account lifecycle lock, before the Customer FKs are detached. */
export async function preserveCustomerFilePrivacyHolds(tx: Prisma.TransactionClient, customerId: string) {
  const cases = await tx.customerPrivacyRequest.findMany({ where: { customerId, holdCategory: { not: null } }, select: { id: true } });
  for (const row of cases) await retainPrivacyCaseOnFiles(tx, customerId, row.id);
}

/** Only an explicit Owner case action releases the corresponding binary hold. */
export async function releasePrivacyCaseOnFiles(tx: Prisma.TransactionClient, caseId: string) {
  await tx.$executeRaw`UPDATE stored_files SET retention_privacy_hold_case_ids = array_remove(retention_privacy_hold_case_ids, ${caseId}::uuid)
    WHERE bucket_scope = 'PRIVATE_CUSTOMER' AND purpose = 'CUSTOMER_UPLOAD'
      AND retention_privacy_hold_case_ids @> ARRAY[${caseId}::uuid]`;
}
