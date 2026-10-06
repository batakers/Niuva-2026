import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { UploadService, type UploadFileRepository } from "@/modules/files/upload-service";
import type { PendingFileForConfirmation } from "@/modules/files/repository";

function fixture(content: Uint8Array, inspection?: { prefix: Uint8Array; sizeBytes: number; sha256: string }) {
  let row: PendingFileForConfirmation | null = null;
  const marked = vi.fn(async () => true);
  const rejected = vi.fn(async () => undefined);
  const deleted = vi.fn(async () => undefined);
  const inspect = vi.fn(async () => inspection ?? ({ prefix: content, sizeBytes: content.byteLength, sha256: createHash("sha256").update(content).digest("hex") }));
  const repository: UploadFileRepository = {
    async createPending(input) {
      row = { ...input, storageKey: "private/fixture.stl", uploadStatus: "PENDING" };
      return { id: input.id, storageKey: row.storageKey };
    },
    async findForUploadConfirmation() { return row; },
    markUploadedIfPending: marked, rejectPendingUpload: rejected,
  };
  const storage = {
    createDownloadUrl: async () => "https://storage.example.test/d",
    createUploadUrl: async () => "https://storage.example.test/u",
    headObject: vi.fn(async () => ({ contentLength: content.byteLength, contentType: "model/stl" })),
    computeSha256: vi.fn(async () => createHash("sha256").update(content).digest("hex")),
    inspectObject: inspect, deleteObject: deleted,
  };
  const authorize = vi.fn(async () => ({ id: crypto.randomUUID() }));
  const service = new UploadService({ repository, storage, now: () => new Date("2026-10-06T00:00:00Z"), audit: async () => undefined, authorize });
  return { service, marked, rejected, deleted, inspect, storage, authorize };
}

async function confirm(t: ReturnType<typeof fixture>, sizeBytes: number) {
  const intent = await t.service.createIntent({ originalName: "part.stl", mimeType: "model/stl", sizeBytes });
  return t.service.confirmUpload({ fileId: intent.fileId, uploadToken: intent.uploadToken });
}

describe("CAD upload confirmation content boundary", () => {
  it("also rejects malformed CAD uploaded through verified request access", async () => {
    const content = Buffer.from("incorrect CAD content"); const t = fixture(content);
    const intent = await t.service.createIntentForVerifiedRequestAccess({ originalName: "part.stl", mimeType: "model/stl", sizeBytes: content.length });
    await expect(t.service.confirmUpload({ fileId: intent.fileId, uploadToken: intent.uploadToken })).rejects.toMatchObject({ code: "UPLOAD_REJECTED" });
    expect(t.authorize).not.toHaveBeenCalled(); expect(t.inspect).toHaveBeenCalledOnce(); expect(t.marked).not.toHaveBeenCalled();
  });
  it.each(["png", "jpg"])("preserves the existing %s reference-photo checksum path", async extension => {
    const content = Buffer.from(extension === "png" ? [0x89, 0x50, 0x4e, 0x47] : [0xff, 0xd8, 0xff, 0xd9]);
    const t = fixture(content); const mimeType = extension === "png" ? "image/png" : "image/jpeg";
    t.storage.headObject.mockResolvedValue({ contentLength: content.length, contentType: mimeType });
    const intent = await t.service.createIntent({ originalName: `photo.${extension}`, mimeType, sizeBytes: content.length });
    await expect(t.service.confirmUpload({ fileId: intent.fileId, uploadToken: intent.uploadToken })).resolves.toMatchObject({ status: "UPLOADED" });
    expect(t.inspect).not.toHaveBeenCalled(); expect(t.storage.computeSha256).toHaveBeenCalledOnce();
    expect(t.marked).toHaveBeenCalledWith(expect.objectContaining({ sha256: createHash("sha256").update(content).digest("hex") }));
  });
  it("fails closed when a runtime adapter lacks inspection", async () => {
    const content = Buffer.from("solid part\nfacet normal 0 0 1\nendsolid part\n");
    const t = fixture(content);
    Object.defineProperty(t.storage, "inspectObject", { value: undefined });
    await expect(confirm(t, content.length)).rejects.toMatchObject({ code: "UPLOAD_REJECTED" });
    expect(t.marked).not.toHaveBeenCalled(); expect(t.deleted).toHaveBeenCalledOnce();
  });
  it("returns a generic rejection when the storage read fails", async () => {
    const content = Buffer.from("solid part\nfacet normal 0 0 1\nendsolid part\n");
    const t = fixture(content);
    t.inspect.mockRejectedValue(new Error("private/fixture.stl SECRET-TEST-DETAIL"));
    try { await confirm(t, content.length); throw new Error("Expected rejection"); }
    catch (error) {
      expect(error).toMatchObject({ code: "UPLOAD_REJECTED" });
      expect(JSON.stringify(error)).not.toContain("SECRET-TEST-DETAIL");
      expect(JSON.stringify(error)).not.toContain("private/fixture.stl");
    }
    expect(t.marked).not.toHaveBeenCalled();
  });
  it("rejects an STL extension with an unrelated body despite matching HEAD and checksum", async () => {
    const content = Buffer.from("this is not an STL file");
    const t = fixture(content);
    await expect(confirm(t, content.length)).rejects.toMatchObject({ code: "UPLOAD_REJECTED" });
    expect(t.marked).not.toHaveBeenCalled(); expect(t.rejected).toHaveBeenCalledOnce(); expect(t.deleted).toHaveBeenCalledOnce();
  });
  it("rejects actual size disagreement independently of HEAD", async () => {
    const content = Buffer.from("solid part\nfacet normal 0 0 1\nendsolid part\n");
    const t = fixture(content, { prefix: content, sizeBytes: content.length + 1, sha256: "a".repeat(64) });
    await expect(confirm(t, content.length)).rejects.toMatchObject({ code: "UPLOAD_REJECTED" });
    expect(t.marked).not.toHaveBeenCalled();
  });
  it("stores the checksum from the inspected snapshot without a second GET", async () => {
    const content = Buffer.from("solid part\nfacet normal 0 0 1\nendsolid part\n");
    const t = fixture(content);
    await expect(confirm(t, content.length)).resolves.toMatchObject({ status: "UPLOADED" });
    expect(t.inspect).toHaveBeenCalledOnce(); expect(t.storage.computeSha256).not.toHaveBeenCalled();
    expect(t.marked).toHaveBeenCalledWith(expect.objectContaining({ sha256: createHash("sha256").update(content).digest("hex") }));
  });
});
