import { describe, expect, it } from "vitest";

import type { AdminAccess } from "@/lib/auth/clerk";
import {
  PrivateFileDownloadService,
  type PrivateFileDownloadRepository,
} from "@/modules/files/download-service";
import type { PrivateObjectStorage } from "@/modules/files/r2";

const admin: AdminAccess = {
  clerkUserId: "user_admin",
  profile: {
    clerkUserId: "user_admin",
    id: "a6f443d8-3e8a-49b5-81d0-94d56e06c208",
    isActive: true,
    role: "ADMIN",
  },
};

const requestId = "f9c2a8b2-22cd-4e7a-9b3f-0c42d5a7b993";
const fileId = "7a0f083f-58e2-4cbd-9fc4-8e8c88f09a81";

function fileRepository(file: Awaited<ReturnType<PrivateFileDownloadRepository["findVerifiedPrivateFileForOwner"]>>): PrivateFileDownloadRepository {
  return {
    async findVerifiedPrivateFileForOwner() {
      return file;
    },
  };
}

function storage() {
  const calls: string[] = [];
  const implementation: PrivateObjectStorage = {
    async createDownloadUrl(input) {
      calls.push(input.key);
      return "https://storage.example.test/signed-download";
    },
    async createUploadUrl() {
      return "https://storage.example.test/upload";
    },
    async deleteObject() {},
    async headObject() {
      return { contentLength: 10, contentType: "model/stl" };
    },
  };
  return { calls, implementation };
}

describe("PrivateFileDownloadService", () => {
  it("issues a short-lived URL only for a verified linked file and audits without the storage key", async () => {
    const events: Array<Record<string, unknown>> = [];
    const objectStorage = storage();
    const service = new PrivateFileDownloadService({
      audit: (event) => { events.push(event); },
      authorizeAdmin: async () => admin,
      now: () => new Date("2026-09-20T00:00:00.000Z"),
      repository: fileRepository({
        fileId,
        mimeType: "model/stl",
        originalName: "part.stl",
        storageKey: "private/customer/secret-key",
      }),
      storage: objectStorage.implementation,
    });

    await expect(service.createDownload({
      fileId,
      ownerId: requestId,
      ownerType: "CUSTOM_PRINT_REQUEST",
    })).resolves.toMatchObject({
      downloadUrl: "https://storage.example.test/signed-download",
      fileId,
      originalName: "part.stl",
    });
    expect(objectStorage.calls).toEqual(["private/customer/secret-key"]);
    expect(events.at(-1)).toMatchObject({
      action: "file.download-url.issued",
      actorId: admin.profile.id,
      metadata: {
        ownerType: "CUSTOM_PRINT_REQUEST",
        operation: "private-file-download",
      },
    });
    expect(JSON.stringify(events)).not.toContain("private/customer/secret-key");
  });

  it("fails closed when the file is not linked and verified", async () => {
    const objectStorage = storage();
    const service = new PrivateFileDownloadService({
      authorizeAdmin: async () => admin,
      repository: fileRepository(null),
      storage: objectStorage.implementation,
    });

    await expect(service.createDownload({
      fileId,
      ownerId: requestId,
      ownerType: "B2B_INQUIRY",
    })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(objectStorage.calls).toHaveLength(0);
  });
});
