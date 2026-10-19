import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import type { AdminAccess } from "@/lib/auth/admin";
import { getPrismaClient } from "@/lib/db/prisma";
import { PublicMediaService } from "@/modules/public-media/service";
import type { PublicMediaStorage } from "@/modules/public-media/storage";
import { CatalogService } from "@/modules/catalog/service";
import { publicMediaUrl, PUBLIC_MEDIA_MAX_BYTES } from "@/modules/public-media/schema";

const prisma = getPrismaClient();
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhKkAAAAASUVORK5CYII=", "base64");
let access: AdminAccess;
let productId: string;
let service: PublicMediaService;
let pending: Uint8Array;
let writes: Readonly<{ key: string; bytes: Uint8Array }>[];
let deletedQuarantineKeys: string[];
let clock: Date;
let storage: PublicMediaStorage;
beforeEach(async () => {
  const actor = await prisma.adminAuthUser.create({ data: { id: randomUUID(), email: `media-${randomUUID()}@example.test`, name: "Media Admin Fixture", emailVerified: true, profile: { create: { role: "ADMIN", isActive: true } } }, include: { profile: true } });
  access = { authUserId: actor.id, profile: actor.profile! };
  productId = (await prisma.product.create({ data: { slug: `media-${randomUUID()}`, name: "Media fixture", description: "Test only" } })).id;
  pending = png; writes = []; deletedQuarantineKeys = []; clock = new Date();
  storage = {
    createUploadUrl: async () => "https://upload.example.test/fixture",
    readQuarantine: async () => pending,
    deleteQuarantine: async key => { deletedQuarantineKeys.push(key); },
    publish: async input => { writes.push({ key: input.key, bytes: input.bytes.slice() }); },
    readPublic: async () => png,
  };
  service = new PublicMediaService({ storage: () => storage, authorize: async () => access, clock: () => clock });
});
const intent = () => service.createIntent({ owner: { kind: "product", id: productId }, contentType: "image/png", sizeBytes: png.length });

describe("Admin public media ownership and verification", () => {
  it("issues a server key, publishes the verified snapshot once and keeps draft media private", async () => {
    const upload = await intent();
    expect(upload).toMatchObject({ assetId: expect.any(String), uploadUrl: "https://upload.example.test/fixture" });
    const result = await service.confirm({ assetId: upload.assetId });
    expect(result.storageKey).toBe(`media/products/${productId}/${upload.assetId}.png`);
    expect(result.url).toBe(`/api/media/public/${upload.assetId}`);
    expect(writes).toHaveLength(1);
    pending = new TextEncoder().encode("changed after upload URL was used");
    expect(await service.confirm({ assetId: upload.assetId })).toEqual(result);
    expect(writes).toHaveLength(1);
    expect(writes[0].bytes).toEqual(png);
    await expect(service.read(upload.assetId, false)).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect((await service.read(upload.assetId, true)).contentType).toBe("image/png");
    expect(await prisma.publicMediaAsset.findUniqueOrThrow({ where: { id: upload.assetId } })).toMatchObject({ status: "VERIFIED", uploadedById: access.profile.id, sha256: expect.stringMatching(/^[a-f0-9]{64}$/) });
  });
  it("rejects a false image MIME claim before writing to the public bucket", async () => {
    const upload = await intent();
    pending = new Uint8Array(png.length).fill(60);
    await expect(service.confirm({ assetId: upload.assetId })).rejects.toMatchObject({ code: "UPLOAD_REJECTED" });
    expect(writes).toEqual([]);
    expect(deletedQuarantineKeys).toHaveLength(1);
    expect(await prisma.publicMediaAsset.findUniqueOrThrow({ where: { id: upload.assetId } })).toMatchObject({ status: "FAILED" });
  });
  it("rejects size mismatch, oversized and expired intents", async () => {
    await expect(service.createIntent({ owner: { kind: "product", id: productId }, contentType: "image/png", sizeBytes: PUBLIC_MEDIA_MAX_BYTES + 1 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const upload = await intent();
    pending = png.subarray(0, png.length - 1);
    await expect(service.confirm({ assetId: upload.assetId })).rejects.toMatchObject({ code: "UPLOAD_REJECTED" });
    expect(deletedQuarantineKeys).toHaveLength(1);
    pending = png;
    const expired = await intent();
    clock = new Date(clock.getTime() + 11 * 60_000);
    await expect(service.confirm({ assetId: expired.assetId })).rejects.toMatchObject({ code: "UPLOAD_REJECTED" });
    expect(writes).toEqual([]);
  });
  it("serializes competing confirmations so the public object is not overwritten", async () => {
    const upload = await intent();
    const outcomes = await Promise.allSettled([service.confirm({ assetId: upload.assetId }), service.confirm({ assetId: upload.assetId })]);
    expect(outcomes.some(outcome => outcome.status === "fulfilled")).toBe(true);
    expect(writes).toHaveLength(1);
  });
  it("rejects a verified asset owned by another product and private Customer keys", async () => {
    const upload = await intent(), media = await service.confirm({ assetId: upload.assetId });
    const another = await prisma.product.create({ data: { slug: `media-other-${randomUUID()}`, name: "Other", description: "Test" } });
    const catalog = new CatalogService({ authorizeAdmin: async () => access });
    await expect(catalog.replaceMedia(another.id, { items: [{ storageKey: media.storageKey, altText: "Test", sortOrder: 0 }] })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await expect(catalog.replaceMedia(productId, { items: [{ storageKey: "private/customer-files/secret.png", altText: "Test", sortOrder: 0 }] })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(publicMediaUrl("private/customer-files/secret.png", "product")).toBeUndefined();
    await catalog.replaceMedia(productId, { items: [{ storageKey: media.storageKey, altText: "Test", sortOrder: 0 }] });
    expect(await prisma.productMedia.findFirst({ where: { productId } })).toMatchObject({ storageKey: media.storageKey });
  });
  it("does not create an intent for an inactive Admin or an unknown owner", async () => {
    await expect(service.createIntent({ owner: { kind: "product", id: randomUUID() }, contentType: "image/png", sizeBytes: png.length })).rejects.toMatchObject({ code: "NOT_FOUND" });
    access = { ...access, profile: { ...access.profile, isActive: false } };
    await expect(intent()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(await prisma.publicMediaAsset.count({ where: { productId } })).toBe(0);
  });
});
