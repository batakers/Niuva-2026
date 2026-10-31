import { z } from "zod";

export const PUBLIC_MEDIA_MAX_BYTES = 10 * 1024 * 1024;
/** Owner, 1 Nov 2026 (PRD addendum): a project gallery holds up to 24 items; product galleries stay at 12. */
export const PUBLIC_MEDIA_MAX_ITEMS = { portfolio: 24, product: 12 } as const satisfies Record<"portfolio" | "product", number>;
export const publicMediaOwnerSchema = z.object({ kind: z.enum(["product", "portfolio"]), id: z.uuid() }).strict();
export type PublicMediaOwner = z.infer<typeof publicMediaOwnerSchema>;
export const publicMediaIntentSchema = z.object({
  owner: publicMediaOwnerSchema,
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.int().min(1).max(PUBLIC_MEDIA_MAX_BYTES),
}).strict();
export const publicMediaConfirmSchema = z.object({ assetId: z.uuid() }).strict();

const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const uploadedKey = new RegExp(`^media/(products|portfolio)/(${uuid})/(${uuid})\\.(jpg|png|webp)$`);
export function parseUploadedMediaKey(key: string): Readonly<{ owner: PublicMediaOwner; assetId: string }> | null {
  const match = uploadedKey.exec(key);
  return match ? { owner: { kind: match[1] === "products" ? "product" : "portfolio", id: match[2] }, assetId: match[3] } : null;
}
export function isStaticPublicMediaKey(key: string, kind: PublicMediaOwner["kind"]): boolean {
  return new RegExp(`^media/${kind === "product" ? "products" : "portfolio"}/[a-z0-9]+(?:-[a-z0-9]+)*\\.(?:png|jpe?g|webp)$`, "i").test(key);
}
export function isPublicMediaKey(key: string, kind: PublicMediaOwner["kind"]): boolean {
  return isStaticPublicMediaKey(key, kind) || parseUploadedMediaKey(key)?.owner.kind === kind;
}
export function publicMediaUrl(key: string, kind: PublicMediaOwner["kind"]): string | undefined {
  if (isStaticPublicMediaKey(key, kind)) return `/${key}`;
  const uploaded = parseUploadedMediaKey(key);
  return uploaded?.owner.kind === kind ? `/api/media/public/${uploaded.assetId}` : undefined;
}

/** Checks the actual image container, not the browser's filename or MIME claim. */
export function matchesPublicImage(bytes: Uint8Array, contentType: string): boolean {
  if (bytes.length < 16 || bytes.length > PUBLIC_MEDIA_MAX_BYTES) return false;
  if (contentType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff && bytes.at(-2) === 0xff && bytes.at(-1) === 0xd9;
  if (contentType === "image/png") return [137,80,78,71,13,10,26,10].every((byte, i) => bytes[i] === byte) && new TextDecoder().decode(bytes.subarray(12, 16)) === "IHDR" && bytes.length >= 45 && new TextDecoder().decode(bytes.subarray(-8, -4)) === "IEND";
  if (contentType === "image/webp") return new TextDecoder().decode(bytes.subarray(0, 4)) === "RIFF" && new TextDecoder().decode(bytes.subarray(8, 12)) === "WEBP" && new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) + 8 === bytes.length && /^(VP8 |VP8L|VP8X)$/.test(new TextDecoder().decode(bytes.subarray(12, 16)));
  return false;
}
