import { appError } from "@/modules/shared/errors";
export const FINANCIAL_EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;
// No financial retention duration has been approved. This is deliberately
// separate from CAD policy; changing it requires its owning legal decision.
export const financialEvidenceRetentionPolicy: Readonly<{ approvedPolicyId: string | null }> = { approvedPolicyId: null };
export function financialEvidenceRuntimeEnabled() { return financialEvidenceRetentionPolicy.approvedPolicyId !== null; }
export function validateFinancialEvidenceContent(extension: string, mime: string, prefix: Uint8Array, size: number): void {
  if (!Number.isSafeInteger(size) || size < 1 || size > FINANCIAL_EVIDENCE_MAX_BYTES || prefix.length > size) throw appError("UPLOAD_REJECTED");
  const pdf = extension === "pdf" && mime === "application/pdf" && /^%PDF-(?:1\.[0-7]|2\.0)/.test(new TextDecoder().decode(prefix.subarray(0, 16)));
  const jpeg = ["jpg", "jpeg"].includes(extension) && mime === "image/jpeg" && prefix.length >= 3 && prefix[0] === 255 && prefix[1] === 216 && prefix[2] === 255;
  const png = extension === "png" && mime === "image/png" && prefix.length >= 24 && [137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => prefix[index] === byte) && new TextDecoder().decode(prefix.subarray(12, 16)) === "IHDR" && new DataView(prefix.buffer, prefix.byteOffset, prefix.byteLength).getUint32(16) > 0 && new DataView(prefix.buffer, prefix.byteOffset, prefix.byteLength).getUint32(20) > 0;
  if (!pdf && !jpeg && !png) throw appError("UPLOAD_REJECTED", { message: "Isi file tidak sesuai JPEG, PNG, atau PDF yang dipilih." });
}
