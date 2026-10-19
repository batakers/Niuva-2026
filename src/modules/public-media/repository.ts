import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { appError } from "@/modules/shared/errors";
import { isStaticPublicMediaKey, parseUploadedMediaKey, type PublicMediaOwner } from "./schema";

type Transaction = Pick<Prisma.TransactionClient, "publicMediaAsset">;
export async function assertOwnedPublicMedia(transaction: Transaction, owner: PublicMediaOwner, keys: readonly string[]): Promise<void> {
  const uploaded = keys.filter(key => !isStaticPublicMediaKey(key, owner.kind));
  if (uploaded.length === 0) return;
  if (uploaded.some(key => {
    const parsed = parseUploadedMediaKey(key);
    return !parsed || parsed.owner.id !== owner.id || parsed.owner.kind !== owner.kind;
  })) throw appError("VALIDATION_ERROR", { details: { media: "Foto harus milik produk atau project ini." } });
  const unique = [...new Set(uploaded)];
  const count = await transaction.publicMediaAsset.count({ where: {
    storageKey: { in: unique }, status: "VERIFIED",
    ...(owner.kind === "product" ? { productId: owner.id } : { projectId: owner.id }),
  } });
  if (count !== unique.length) throw appError("VALIDATION_ERROR", { details: { media: "Foto belum selesai diverifikasi." } });
}

export class PublicMediaRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}
  ownerExists(owner: PublicMediaOwner) {
    return owner.kind === "product"
      ? this.prisma.product.findUnique({ where: { id: owner.id }, select: { id: true } })
      : this.prisma.portfolioProject.findUnique({ where: { id: owner.id }, select: { id: true } });
  }
  create(data: Prisma.PublicMediaAssetUncheckedCreateInput) { return this.prisma.publicMediaAsset.create({ data }); }
  find(id: string) { return this.prisma.publicMediaAsset.findUnique({ where: { id } }); }
  list(owner: PublicMediaOwner) {
    return this.prisma.publicMediaAsset.findMany({ where: { status: "VERIFIED", ...(owner.kind === "product" ? { productId: owner.id } : { projectId: owner.id }) }, orderBy: { createdAt: "desc" }, take: 100 });
  }
  async claim(id: string, now: Date) {
    const result = await this.prisma.publicMediaAsset.updateMany({ where: { id, status: "PENDING", expiresAt: { gt: now } }, data: { status: "VERIFYING" } });
    return result.count === 1;
  }
  fail(id: string) { return this.prisma.publicMediaAsset.updateMany({ where: { id, status: "VERIFYING" }, data: { status: "FAILED" } }); }
  complete(id: string, actorId: string, sha256: string, now: Date) {
    return this.prisma.$transaction(async transaction => {
      const asset = await transaction.publicMediaAsset.update({ where: { id, status: "VERIFYING" }, data: { status: "VERIFIED", sha256, verifiedAt: now } });
      await transaction.auditLog.create({ data: { action: "public-media.verified", actorId, actorType: "ADMIN", entityId: id, entityType: "PublicMediaAsset", afterJson: { productId: asset.productId, projectId: asset.projectId, sizeBytes: asset.sizeBytes } } });
      return asset;
    });
  }
  async isPublishedAndAttached(asset: Readonly<{ productId: string | null; projectId: string | null; storageKey: string }>): Promise<boolean> {
    if (asset.productId) return await this.prisma.productMedia.count({ where: { productId: asset.productId, storageKey: asset.storageKey, product: { isPublished: true } } }) > 0;
    if (asset.projectId) return await this.prisma.portfolioMedia.count({ where: { projectId: asset.projectId, storageKey: asset.storageKey, project: { isPublished: true } } }) > 0;
    return false;
  }
}
