import "server-only";
import { randomBytes, randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import type { AdminAccess } from "@/lib/auth/admin";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { createR2PrivateObjectStorageFromEnvironment, type PrivateObjectStorage } from "@/modules/files/r2";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";
import { financeAudit, withFinanceTransaction } from "./repository";
import { FINANCIAL_EVIDENCE_MAX_BYTES, financialEvidenceRuntimeEnabled, validateFinancialEvidenceContent } from "./evidence-policy";
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
const prepareSchema = z.object({ expenseId: z.uuid(), originalName: z.string().trim().min(1).max(180).refine(value => !/[\\/\u0000-\u001f]/.test(value)), mimeType: z.enum(["image/jpeg", "image/png", "application/pdf"]), sizeBytes: z.number().int().positive().max(FINANCIAL_EVIDENCE_MAX_BYTES) }).strict();
const verifySchema = z.object({ expenseId: z.uuid(), fileId: z.uuid(), uploadToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }).strict();
export class FinancialEvidenceService {
  constructor(private readonly dependencies: Readonly<{ storage?: PrivateObjectStorage; syntheticTestAdapter?: boolean }> = {}) {}
  private storage(): PrivateObjectStorage {
    if (process.env.NODE_ENV === "test" && this.dependencies.syntheticTestAdapter && this.dependencies.storage) return this.dependencies.storage;
    if (!financialEvidenceRuntimeEnabled()) throw appError("PROVIDER_UNAVAILABLE", { message: "Penyimpanan bukti belum tersedia. Pengeluaran tetap bisa disimpan tanpa lampiran." });
    return createR2PrivateObjectStorageFromEnvironment();
  }
  async prepare(access: AdminAccess, input: unknown) {
    requireAdminPermission(access, "FINANCE_WRITE");
    const parsed = parseWithValidation(prepareSchema, input), storage = this.storage();
    const extension = parsed.originalName.split(".").at(-1)?.toLowerCase() ?? "";
    if (!((extension === "pdf" && parsed.mimeType === "application/pdf") || (extension === "png" && parsed.mimeType === "image/png") || (["jpg", "jpeg"].includes(extension) && parsed.mimeType === "image/jpeg"))) throw appError("UPLOAD_REJECTED");
    const token = randomBytes(32).toString("base64url"), expiresAt = new Date(Date.now() + 600_000), id = randomUUID();
    const file = await withFinanceTransaction(access, "FINANCE_WRITE", async tx => {
      const expense = await tx.expenseEntry.findFirst({ where: { id: parsed.expenseId, reversalOfId: null, reversedBy: { is: null }, proofFileId: null }, select: { id: true } });
      if (!expense) throw appError("CONFLICT", { message: "Pengeluaran tidak tersedia untuk menambahkan bukti." });
      return tx.storedFile.create({ data: { id, purpose: "FINANCIAL_EVIDENCE", uploadedByAdminId: access.profile.id, bucketScope: "PRIVATE_CUSTOMER", storageKey: `private/finance/${expense.id}/${id}`, originalName: parsed.originalName, mimeType: parsed.mimeType, extension, sizeBytes: BigInt(parsed.sizeBytes), uploadTokenHash: hash(token), uploadExpiresAt: expiresAt } });
    });
    const uploadUrl = await storage.createUploadUrl({ key: file.storageKey, contentType: file.mimeType, expiresInSeconds: 600 });
    return { fileId: file.id, uploadToken: token, uploadUrl, requiredHeaders: { "content-type": file.mimeType }, expiresAt: expiresAt.toISOString() };
  }
  async verifyAndAttach(access: AdminAccess, input: unknown) {
    requireAdminPermission(access, "FINANCE_WRITE");
    const parsed = parseWithValidation(verifySchema, input), storage = this.storage();
    const file = await withFinanceTransaction(access, "FINANCE_WRITE", async tx => tx.storedFile.findFirst({ where: { id: parsed.fileId, purpose: "FINANCIAL_EVIDENCE", bucketScope: "PRIVATE_CUSTOMER", uploadedByAdminId: access.profile.id, uploadStatus: "PENDING", uploadTokenHash: hash(parsed.uploadToken), uploadExpiresAt: { gt: new Date() }, storageKey: `private/finance/${parsed.expenseId}/${parsed.fileId}` } }));
    if (!file) throw appError("FORBIDDEN");
    const head = await storage.headObject(file.storageKey), inspected = await storage.inspectObject(file.storageKey, FINANCIAL_EVIDENCE_MAX_BYTES);
    if (head.contentLength !== Number(file.sizeBytes) || head.contentType !== file.mimeType || inspected.sizeBytes !== Number(file.sizeBytes) || !/^[a-f0-9]{64}$/.test(inspected.sha256)) throw appError("UPLOAD_REJECTED");
    validateFinancialEvidenceContent(file.extension, file.mimeType, inspected.prefix, inspected.sizeBytes);
    return withFinanceTransaction(access, "FINANCE_WRITE", async tx => {
      const current = await tx.storedFile.findFirst({ where: { id: file.id, uploadStatus: "PENDING", uploadTokenHash: hash(parsed.uploadToken), uploadExpiresAt: { gt: new Date() } }, select: { id: true } });
      const expense = await tx.expenseEntry.findFirst({ where: { id: parsed.expenseId, proofFileId: null, reversalOfId: null, reversedBy: { is: null } }, select: { id: true } });
      if (!current || !expense) throw appError("CONFLICT");
      await tx.storedFile.update({ where: { id: file.id }, data: { uploadStatus: "VERIFIED", uploadedAt: new Date(), verifiedAt: new Date(), sha256: inspected.sha256, uploadTokenHash: null, uploadExpiresAt: null } });
      await tx.expenseEntry.update({ where: { id: expense.id }, data: { proofFileId: file.id } });
      await financeAudit(tx, access, "ExpenseEntry", expense.id, "finance.expense.evidence-attached");
      return { fileId: file.id, status: "VERIFIED" as const };
    });
  }
  async download(access: AdminAccess, expenseId: string, fileId: string) {
    parseWithValidation(z.uuid(), expenseId); parseWithValidation(z.uuid(), fileId);
    const file = await withFinanceTransaction(access, "FINANCE_READ", async tx => tx.storedFile.findFirst({ where: { id: fileId, purpose: "FINANCIAL_EVIDENCE", bucketScope: "PRIVATE_CUSTOMER", uploadStatus: "VERIFIED", deletedAt: null, expenseProofs: { some: { id: expenseId } } }, select: { storageKey: true } }));
    if (!file) throw appError("NOT_FOUND");
    return this.storage().createDownloadUrl({ key: file.storageKey, expiresInSeconds: 300 });
  }
}
