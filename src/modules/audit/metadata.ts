const AUDIT_METADATA_KEYS = [
  "operation",
  "provider",
  "providerOrderId",
  "reason",
  "referenceNumber",
  "requestId",
  "result",
  "source",
  "status",
] as const;

type AuditMetadataKey = (typeof AUDIT_METADATA_KEYS)[number];
type AuditMetadataValue = boolean | number | string | null;

export type AuditMetadata = Readonly<
  Partial<Record<AuditMetadataKey, AuditMetadataValue>>
>;

function isAuditMetadataKey(value: string): value is AuditMetadataKey {
  return (AUDIT_METADATA_KEYS as readonly string[]).includes(value);
}

function isAuditMetadataValue(value: unknown): value is AuditMetadataValue {
  return (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  );
}

export function sanitizeAuditMetadata(
  metadata: Readonly<Record<string, unknown>> | undefined,
): AuditMetadata | undefined {
  if (metadata === undefined) {
    return undefined;
  }

  const sanitized: Partial<Record<AuditMetadataKey, AuditMetadataValue>> = {};

  for (const [key, value] of Object.entries(metadata)) {
    if (isAuditMetadataKey(key) && isAuditMetadataValue(value)) {
      sanitized[key] = value;
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}
