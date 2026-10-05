import { createHash } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { PrivateObjectStorage } from "@/modules/files/r2";
import type { PendingFileForConfirmation } from "@/modules/files/repository";
import { UploadService, type UploadFileRepository } from "@/modules/files/upload-service";

const NOW = new Date("2026-09-05T08:00:00.000Z");
const CONTENT = Buffer.from("abc");
const EXPECTED = createHash("sha256").update(CONTENT).digest("hex");

type Row = { -readonly [K in keyof PendingFileForConfirmation]: PendingFileForConfirmation[K] } & {
  sha256: string | null;
  verifiedAt: Date | null;
};

class Repo implements UploadFileRepository {
  readonly rows = new Map<string, Row>();
  failUpdate = false;

  async createPending(input: Parameters<UploadFileRepository["createPending"]>[0]) {
    const row: Row = {
      bucketScope: "PRIVATE_CUSTOMER",
      id: input.id,
      mimeType: input.mimeType,
      sha256: null,
      sizeBytes: input.sizeBytes,
      storageKey: `private/customer/${input.id}`,
      uploadExpiresAt: input.uploadExpiresAt,
      uploadStatus: "PENDING",
      uploadTokenHash: input.uploadTokenHash,
      verifiedAt: null,
    };
    this.rows.set(row.id, row);
    return { id: row.id, storageKey: row.storageKey };
  }

  async findForUploadConfirmation(fileId: string) {
    return this.rows.get(fileId) ?? null;
  }

  // Mirrors the real single conditional UPDATE: all-or-nothing.
  async markUploadedIfPending(input: Parameters<UploadFileRepository["markUploadedIfPending"]>[0]) {
    if (this.failUpdate) {
      throw new Error("db down");
    }
    const row = this.rows.get(input.fileId);
    if (row === undefined || row.uploadStatus !== "PENDING") {
      return false;
    }
    row.uploadStatus = "UPLOADED";
    row.uploadTokenHash = null;
    row.uploadExpiresAt = null;
    if (input.sha256 !== undefined) {
      row.sha256 = input.sha256;
      row.verifiedAt = input.now;
    }
    return true;
  }

  async rejectPendingUpload(fileId: string) {
    const row = this.rows.get(fileId);
    if (row !== undefined) {
      row.uploadStatus = "REJECTED";
      row.uploadTokenHash = null;
    }
  }
}

function makeStorage(overrides: Partial<PrivateObjectStorage> = {}): PrivateObjectStorage {
  return {
    computeSha256: async () => EXPECTED,
    createDownloadUrl: async () => "https://storage.example.test/d",
    createUploadUrl: async () => "https://storage.example.test/u",
    deleteObject: async () => undefined,
    headObject: async () => ({ contentLength: 3, contentType: "model/stl" }),
    ...overrides,
  };
}

async function setup(storage: PrivateObjectStorage) {
  const repository = new Repo();
  const service = new UploadService({
    audit: async () => undefined,
    authorize: async () => ({ id: "00000000-0000-4000-8000-000000000001" }),
    now: () => NOW,
    randomBytes: (size) => new Uint8Array(size).fill(7),
    repository,
    storage,
  });
  const intent = await service.createIntent({
    mimeType: "model/stl",
    originalName: "part.stl",
    sizeBytes: 3,
  });
  return {
    confirm: () => service.confirmUpload({ fileId: intent.fileId, uploadToken: intent.uploadToken }),
    row: () => repository.rows.get(intent.fileId),
    repository,
  };
}

describe("upload confirmation checksum (Req 12.7)", () => {
  it("stores lower-case hex sha256 together with verifiedAt", async () => {
    const t = await setup(makeStorage());
    await t.confirm();
    expect(t.row()?.sha256).toBe(EXPECTED);
    expect(t.row()?.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(t.row()?.verifiedAt).toEqual(NOW);
  });

  it("leaves sha256 and verifiedAt null on metadata mismatch", async () => {
    const t = await setup(
      makeStorage({ headObject: async () => ({ contentLength: 4, contentType: "model/stl" }) }),
    );
    await expect(t.confirm()).rejects.toMatchObject({ code: "UPLOAD_REJECTED" });
    expect(t.row()).toMatchObject({ sha256: null, uploadStatus: "REJECTED", verifiedAt: null });
  });

  it("leaves both null when the object is absent or cannot be hashed", async () => {
    const absent = await setup(
      makeStorage({ headObject: async () => { throw new Error("NotFound"); } }),
    );
    await expect(absent.confirm()).rejects.toMatchObject({ code: "UPLOAD_REJECTED" });
    expect(absent.row()).toMatchObject({ sha256: null, verifiedAt: null });

    const unhashable = await setup(
      makeStorage({ computeSha256: async () => "NOT-HEX" }),
    );
    await expect(unhashable.confirm()).rejects.toMatchObject({ code: "UPLOAD_REJECTED" });
    expect(unhashable.row()).toMatchObject({ sha256: null, uploadStatus: "REJECTED", verifiedAt: null });
  });

  it("leaves no partial write when the update fails", async () => {
    const t = await setup(makeStorage());
    t.repository.failUpdate = true;
    await expect(t.confirm()).rejects.toThrow("db down");
    expect(t.row()).toMatchObject({ sha256: null, uploadStatus: "PENDING", verifiedAt: null });
  });
});
