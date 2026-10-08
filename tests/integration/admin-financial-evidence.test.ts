import { randomUUID, createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { FinancialEvidenceService } from "@/modules/finance/evidence-service";
import { ExpenseService } from "@/modules/finance/expense-service";
import { financeActor, financePrisma as prisma } from "./helpers/finance";
import type { PrivateObjectStorage } from "@/modules/files/r2";
describe("synthetic private financial upload", () => {
  it("binds actual proof only to its intended expense and authorized uploader", async () => {
    const access = await financeActor("ADMIN"), other = await financeActor("ADMIN"), service = new ExpenseService();
    const input = { amountRp: "1000", expenseDate: "2026-10-01", category: "OTHER", description: "Synthetic proof expense TEST", idempotencyKey: randomUUID() };
    const a = await service.record(access, input), b = await service.record(access, { ...input, idempotencyKey: randomUUID() });
    const bytes = new TextEncoder().encode("%PDF-1.7\nSynthetic TEST proof\n%%EOF\n"), hash = createHash("sha256").update(bytes).digest("hex");
    const storage: PrivateObjectStorage = { createUploadUrl: async () => "https://synthetic-storage.example.test/upload", createDownloadUrl: async () => "https://synthetic-storage.example.test/download", deleteObject: vi.fn(), headObject: async () => ({ contentLength: bytes.length, contentType: "application/pdf" }), inspectObject: async () => ({ prefix: bytes, sizeBytes: bytes.length, sha256: hash }) };
    const evidence = new FinancialEvidenceService({ storage, syntheticTestAdapter: true });
    const intent = await evidence.prepare(access, { expenseId: a.id, originalName: "fixture.pdf", mimeType: "application/pdf", sizeBytes: bytes.length });
    await expect(evidence.verifyAndAttach(other, { expenseId: a.id, fileId: intent.fileId, uploadToken: intent.uploadToken })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(evidence.verifyAndAttach(access, { expenseId: b.id, fileId: intent.fileId, uploadToken: intent.uploadToken })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await evidence.verifyAndAttach(access, { expenseId: a.id, fileId: intent.fileId, uploadToken: intent.uploadToken });
    expect((await service.detail(access, a.id))?.proofFileId).toBe(intent.fileId);
    expect(await evidence.download(other, a.id, intent.fileId)).toContain("synthetic-storage");
    await expect(service.record(access, { ...input, proofFileId: intent.fileId, idempotencyKey: randomUUID() })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(prisma.storedFile.update({ where: { id: intent.fileId }, data: { bucketScope: "PUBLIC_MEDIA" } })).rejects.toThrow();
    await expect(new FinancialEvidenceService().prepare(access, { expenseId: b.id, originalName: "fixture.pdf", mimeType: "application/pdf", sizeBytes: bytes.length })).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
  });
});
