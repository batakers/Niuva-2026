import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import type { PublicMediaAsset } from "@/generated/prisma/client";
import { requireAdmin, type AdminAccess } from "@/lib/auth/admin";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";
import { PublicMediaRepository } from "./repository";
import { matchesPublicImage, PUBLIC_MEDIA_MAX_BYTES, publicMediaConfirmSchema, publicMediaIntentSchema, publicMediaOwnerSchema, type PublicMediaOwner } from "./schema";
import { createPublicMediaStorage, type PublicMediaStorage } from "./storage";

function ownerOf(asset: PublicMediaAsset): PublicMediaOwner {
  return asset.productId ? { kind: "product", id: asset.productId } : { kind: "portfolio", id: asset.projectId! };
}
function projection(asset: PublicMediaAsset) { return { assetId: asset.id, storageKey: asset.storageKey, url: `/api/media/public/${asset.id}` }; }
export class PublicMediaService {
  private readonly repository: PublicMediaRepository;
  private readonly authorize: () => Promise<AdminAccess>;
  private readonly storage: () => PublicMediaStorage;
  private readonly clock: () => Date;
  constructor(options: Readonly<{ repository?: PublicMediaRepository; authorize?: () => Promise<AdminAccess>; storage?: () => PublicMediaStorage; clock?: () => Date }> = {}) {
    this.repository = options.repository ?? new PublicMediaRepository(); this.authorize = options.authorize ?? requireAdmin;
    this.storage = options.storage ?? createPublicMediaStorage; this.clock = options.clock ?? (() => new Date());
  }
  private async access(owner: PublicMediaOwner) {
    const actor = await this.authorize();
    requireAdminPermission(actor, owner.kind === "product" ? "CATALOG_WRITE" : "PORTFOLIO_WRITE");
    return actor;
  }
  async createIntent(input: unknown) {
    const parsed = parseWithValidation(publicMediaIntentSchema, input), actor = await this.access(parsed.owner);
    if (!await this.repository.ownerExists(parsed.owner)) throw appError("NOT_FOUND");
    const storage = this.storage(), id = randomUUID(), now = this.clock();
    const extension = parsed.contentType === "image/jpeg" ? "jpg" : parsed.contentType.slice(6);
    const quarantineKey = `admin-media-quarantine/${id}`, storageKey = `media/${parsed.owner.kind === "product" ? "products" : "portfolio"}/${parsed.owner.id}/${id}.${extension}`;
    const uploadUrl = await storage.createUploadUrl(quarantineKey, parsed.sizeBytes);
    await this.repository.create({ id, productId: parsed.owner.kind === "product" ? parsed.owner.id : null, projectId: parsed.owner.kind === "portfolio" ? parsed.owner.id : null, uploadedById: actor.profile.id, storageKey, quarantineKey, contentType: parsed.contentType, sizeBytes: parsed.sizeBytes, expiresAt: new Date(now.getTime() + 600_000) });
    return { assetId: id, uploadUrl };
  }
  async list(input: unknown) {
    const owner = parseWithValidation(publicMediaOwnerSchema, input); await this.access(owner);
    if (!await this.repository.ownerExists(owner)) throw appError("NOT_FOUND");
    return (await this.repository.list(owner)).map(projection);
  }
  async confirm(input: unknown) {
    const { assetId } = parseWithValidation(publicMediaConfirmSchema, input), asset = await this.repository.find(assetId);
    if (!asset) throw appError("NOT_FOUND");
    const actor = await this.access(ownerOf(asset));
    if (actor.profile.id !== asset.uploadedById) throw appError("FORBIDDEN");
    if (asset.status === "VERIFIED") return projection(asset);
    if (asset.status !== "PENDING" || asset.expiresAt <= this.clock()) throw appError("UPLOAD_REJECTED");
    const storage = this.storage();
    if (!await this.repository.claim(assetId, this.clock())) throw appError("RESOURCE_BUSY");
    try {
      const bytes = await storage.readQuarantine(asset.quarantineKey);
      if (bytes.length !== asset.sizeBytes || bytes.length > PUBLIC_MEDIA_MAX_BYTES || !matchesPublicImage(bytes, asset.contentType)) throw appError("UPLOAD_REJECTED", { message: "Isi atau ukuran foto tidak cocok. Pilih JPEG, PNG, atau WebP yang valid." });
      // Publish this verified snapshot; a still-valid quarantine PUT cannot alter it.
      await storage.publish({ key: asset.storageKey, bytes, contentType: asset.contentType });
      return projection(await this.repository.complete(asset.id, actor.profile.id, createHash("sha256").update(bytes).digest("hex"), this.clock()));
    } catch (error) {
      await this.repository.fail(asset.id);
      try { await storage.deleteQuarantine(asset.quarantineKey); }
      catch { throw appError("PROVIDER_UNAVAILABLE", { message: "Foto ditolak, tetapi berkas sementara belum dapat dihapus." }); }
      throw error;
    }
  }
  async read(assetId: unknown, allowDraft = false) {
    const id = parseWithValidation(z.uuid(), assetId), asset = await this.repository.find(id);
    if (!asset || asset.status !== "VERIFIED") throw appError("NOT_FOUND");
    if (allowDraft) await this.access(ownerOf(asset));
    else if (!await this.repository.isPublishedAndAttached(asset)) throw appError("NOT_FOUND");
    return { bytes: await this.storage().readPublic(asset.storageKey), contentType: asset.contentType };
  }
}
