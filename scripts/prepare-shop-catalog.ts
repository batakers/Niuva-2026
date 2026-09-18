import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

import Decimal from "decimal.js";

import {
  resolveCatalogPublishApproval,
  type CatalogPublishDecision,
} from "../src/modules/catalog/publish-decisions";
import { catalogSeedSchema, type CatalogSeedInput } from "../src/modules/catalog/seed";

type SourceRecord = Record<string, unknown>;

type SourceDataset = {
  products: SourceRecord[];
  variants: SourceRecord[];
  images: SourceRecord[];
};

type PreparedMedia = CatalogSeedInput["products"][number]["media"][number] & {
  sourcePath: string;
};

type PreparedProduct = Omit<CatalogSeedInput["products"][number], "media"> & {
  media: PreparedMedia[];
};

const datasetRoot = resolve(
  process.env.SHOP_DATASET_DIR?.trim() || "docs/source/Dataset Shop Niuva",
);
const sourceJsonPath = resolve(datasetRoot, "Niuva_Tokopedia_Products.json");
const publishApprovalPath = resolve(datasetRoot, "catalog-publish-decisions.json");
const seedOutputPath = resolve(datasetRoot, "catalog-seed.json");
const variantMediaMapOutputPath = resolve(datasetRoot, "variant-media-map.json");
const publicRoot = resolve("public");

function record(value: unknown, label: string): SourceRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`${label} harus berupa object.`);
  }
  return value as SourceRecord;
}

function records(value: unknown, label: string): SourceRecord[] {
  if (!Array.isArray(value)) throw new Error(`${label} harus berupa array.`);
  return value.map((item, index) => record(item, `${label}[${index}]`));
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} harus berupa text non-kosong.`);
  }
  return value.trim();
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== "string" || value.trim() === "") return undefined;
  return value.trim();
}

function numberValue(value: unknown, label: string): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  throw new Error(`${label} harus berupa angka.`);
}

function integerText(value: unknown, label: string): string {
  const raw = text(String(value), label);
  if (!/^\d+$/.test(raw)) throw new Error(`${label} harus berupa integer non-negatif.`);
  return raw;
}

function digitString(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isSafeInteger(value) && value >= 0) return String(value);
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return value.trim();
  return undefined;
}

function slugify(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (normalized === "") throw new Error(`Tidak dapat membuat slug dari: ${value}`);
  return normalized;
}

function cleanDescription(value: string): string {
  // The source export contains U+FFFD where a dash was lost during extraction.
  return value.replaceAll("\uFFFD", "-").trim();
}

function decimalText(value: unknown, label: string): string {
  const raw = text(String(value), label);
  const decimal = new Decimal(raw);
  if (!decimal.isFinite() || decimal.isNegative()) {
    throw new Error(`${label} harus berupa desimal non-negatif.`);
  }
  return decimal.toFixed(6).replace(/(?:\.0+|(?<=\.[0-9]*?)0+)$/, "");
}

function weightGrams(value: unknown, unit: unknown, label: string): string {
  const raw = decimalText(value, label);
  const normalizedUnit = optionalText(unit)?.toUpperCase();
  const grams = normalizedUnit === "KILOGRAM"
    ? new Decimal(raw).mul(1000)
    : new Decimal(raw);
  return grams.toFixed(3).replace(/(?:\.0+|(?<=\.[0-9]*?)0+)$/, "");
}

function sourceId(value: unknown, label: string): string {
  const id = text(String(value), label);
  if (!/^\d+$/.test(id) || id === "0") throw new Error(`${label} bukan ID sumber positif.`);
  return id;
}

function localPath(value: unknown, label: string): string {
  const normalized = text(value, label).replaceAll("\\", "/");
  if (!normalized.startsWith("Niuva_Product_Images/")) {
    throw new Error(`${label} harus berada di Niuva_Product_Images/.`);
  }
  return normalized;
}

function isVerifiedVariant(item: SourceRecord): boolean {
  return item.placeholder_varian !== true
    && item.status_varian === "TERSEDIA"
    && digitString(item.harga_varian) !== undefined
    && digitString(item.variant_product_id) !== undefined
    && digitString(item.variant_product_id) !== "0";
}

function mediaPriority(item: SourceRecord): number {
  return item.scope === "product_gallery" ? 0 : 1;
}

function prepareMedia(
  product: SourceRecord,
  productSlug: string,
  productImages: SourceRecord[],
): PreparedMedia[] {
  const grouped = new Map<string, { rows: SourceRecord[] }>();
  for (const image of productImages) {
    if (image.media_type !== "image") continue;
    const sourcePath = localPath(image.local_path, `images ${text(product.product_id, "product_id")}`);
    const existing = grouped.get(sourcePath);
    if (existing) existing.rows.push(image);
    else grouped.set(sourcePath, { rows: [image] });
  }

  const unique = [...grouped.entries()]
    .map(([sourcePath, value]) => ({ sourcePath, rows: value.rows }))
    .sort((left, right) => {
      const leftPriority = Math.min(...left.rows.map(mediaPriority));
      const rightPriority = Math.min(...right.rows.map(mediaPriority));
      if (leftPriority !== rightPriority) return leftPriority - rightPriority;
      return left.sourcePath.localeCompare(right.sourcePath);
    });

  const mainGallery = unique.find((item) => item.rows.some((row) => row.scope === "product_gallery"));
  const variants = unique.filter((item) => item.rows.some((row) => row.scope === "variant"));
  const remainingGallery = unique.filter((item) => item !== mainGallery && !variants.includes(item));
  const selected = [
    ...(mainGallery ? [mainGallery] : []),
    ...variants,
    ...remainingGallery,
  ].slice(0, 12);

  return selected.map((item, index) => {
    const variantValues = [...new Set(
      item.rows
        .map((row) => optionalText(row.variant_values))
        .filter((value): value is string => value !== undefined),
    )];
    const isVariant = item.rows.some((row) => row.scope === "variant");
    const suffix = String(index + 1).padStart(2, "0");
    const storageKey = `media/products/${productSlug}-${suffix}.jpg`;
    const altText = isVariant && variantValues.length > 0
      ? `Foto varian ${variantValues.slice(0, 3).join(", ")}`
      : `Foto produk ${text(product.nama_produk, "nama_produk")}`;
    return { altText, sortOrder: index, sourcePath: item.sourcePath, storageKey };
  });
}

async function copyPreparedMedia(media: PreparedMedia[]): Promise<void> {
  for (const item of media) {
    const source = resolve(datasetRoot, ...item.sourcePath.split("/"));
    const destination = resolve(publicRoot, ...item.storageKey.split("/"));
    const sourceRelative = relative(datasetRoot, source);
    if (sourceRelative.startsWith("..") || isAbsolute(sourceRelative)) {
      throw new Error(`Asset sumber di luar dataset: ${item.sourcePath}`);
    }
    const destinationRelative = relative(publicRoot, destination);
    if (destinationRelative.startsWith("..") || isAbsolute(destinationRelative)) {
      throw new Error(`Asset tujuan di luar public/: ${item.storageKey}`);
    }
    await mkdir(resolve(destination, ".."), { recursive: true });
    await copyFile(source, destination);
  }
}

const rawDataset = record(JSON.parse(await readFile(sourceJsonPath, "utf8")) as unknown, "dataset");
const dataset: SourceDataset = {
  images: records(rawDataset.images, "dataset.images"),
  products: records(rawDataset.products, "dataset.products"),
  variants: records(rawDataset.variants, "dataset.variants"),
};
const publishApproval = resolveCatalogPublishApproval(
  JSON.parse(await readFile(publishApprovalPath, "utf8")) as unknown,
  dataset.products.map((product) => ({
    name: text(product.nama_produk, "products.nama_produk"),
    sourceProductId: sourceId(product.product_id, "products.product_id"),
  })),
);

const categoryNames = new Map<string, string>();
const usedSlugs = new Set<string>();
const usedSkus = new Set<string>();
const imageByProduct = new Map<string, SourceRecord[]>();
for (const image of dataset.images) {
  const productId = sourceId(image.parent_product_id, "images.parent_product_id");
  const rows = imageByProduct.get(productId);
  if (rows) rows.push(image);
  else imageByProduct.set(productId, [image]);
}

const variantsByProduct = new Map<string, SourceRecord[]>();
for (const variant of dataset.variants) {
  const productId = sourceId(variant.parent_product_id, "variants.parent_product_id");
  const rows = variantsByProduct.get(productId);
  if (rows) rows.push(variant);
  else variantsByProduct.set(productId, [variant]);
}

const preparedProducts: PreparedProduct[] = [];
const slugByProductId = new Map<string, string>();
let skippedPlaceholders = 0;
for (const product of dataset.products) {
  const productId = sourceId(product.product_id, "products.product_id");
  const productName = text(product.nama_produk, `products.${productId}.nama_produk`);
  const publishDecision = publishApproval.decisions.get(productId);
  if (publishDecision === undefined) {
    throw new Error(`Keputusan publish tidak ditemukan untuk produk ${productId}.`);
  }
  const baseSlug = slugify(productName);
  const productSlug = usedSlugs.has(baseSlug) ? `${baseSlug}-${productId}` : baseSlug;
  usedSlugs.add(productSlug);
  slugByProductId.set(productId, productSlug);

  const categoryName = optionalText(product.kategori);
  const categorySlug = categoryName ? slugify(categoryName) : undefined;
  if (categorySlug && categoryName) categoryNames.set(categorySlug, categoryName);

  const sourceVariants = variantsByProduct.get(productId) ?? [];
  const productVariants = sourceVariants.filter(isVerifiedVariant);
  skippedPlaceholders += sourceVariants.length - productVariants.length;
  const variants = productVariants.length > 0
    ? productVariants.map((variant) => {
      const sku = sourceId(variant.variant_product_id, `variants.${productId}.variant_product_id`);
      if (usedSkus.has(sku)) throw new Error(`SKU sumber duplikat: ${sku}`);
      usedSkus.add(sku);
      const optionValues = [variant.varian_1_nilai, variant.varian_2_nilai]
        .map(optionalText)
        .filter((value): value is string => value !== undefined);
      return {
        isActive: true,
        name: optionValues.length > 0 ? optionValues.join(" / ") : text(variant.variant_nama_produk, "variant_nama_produk"),
        priceRp: integerText(variant.harga_varian, `variants.${sku}.harga_varian`),
        sku,
        stockOnHand: Math.max(0, Math.trunc(numberValue(variant.stok_varian, `variants.${sku}.stok_varian`))),
        weightGrams: weightGrams(product.berat, product.satuan_berat, `products.${productId}.berat`),
      };
    })
    : (() => {
      const sku = productId;
      if (usedSkus.has(sku)) throw new Error(`SKU sumber duplikat: ${sku}`);
      usedSkus.add(sku);
      return [{
        isActive: true,
        name: "Default",
        priceRp: integerText(product.harga_detail, `products.${productId}.harga_detail`),
        sku,
        stockOnHand: Math.max(0, Math.trunc(numberValue(product.stok_tersedia_public, `products.${productId}.stok_tersedia_public`))),
        weightGrams: weightGrams(product.berat, product.satuan_berat, `products.${productId}.berat`),
      }];
    })();

  const media = prepareMedia(product, productSlug, imageByProduct.get(productId) ?? []);
  if (media.length === 0) throw new Error(`Produk ${productId} tidak memiliki media lokal.`);
  preparedProducts.push({
    categorySlug,
    description: cleanDescription(text(product.deskripsi, `products.${productId}.deskripsi`)),
    isPublished: publishDecision === "PUBLISH_READY_MADE",
    media,
    name: productName,
    slug: productSlug,
    variants,
  });
}

const seedInput = catalogSeedSchema.parse({
  categories: [...categoryNames.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([slug, name], sortOrder) => ({ name, slug, sortOrder })),
  products: preparedProducts.map(({ media, ...product }) => ({
    ...product,
    media: media.map((item) => {
      const { sourcePath, ...mapped } = item;
      void sourcePath;
      return mapped;
    }),
  })),
  version: 1,
}) as CatalogSeedInput;

await Promise.all(preparedProducts.map((product) => copyPreparedMedia(product.media)));
await writeFile(seedOutputPath, `${JSON.stringify(seedInput, null, 2)}\n`, "utf8");

const mediaByProductSlug = new Map(
  preparedProducts.map((product) => [
    product.slug,
    new Map(product.media.map((media) => [media.sourcePath, media.storageKey])),
  ]),
);
const variantMediaMap = dataset.variants.map((variant) => {
  const parentProductId = sourceId(variant.parent_product_id, "variants.parent_product_id");
  const sourcePath = localPath(variant.foto_varian_lokal, `variants.${parentProductId}.foto_varian_lokal`);
  const productSlug = slugByProductId.get(parentProductId);
  const storageKey = productSlug === undefined
    ? undefined
    : mediaByProductSlug.get(productSlug)?.get(sourcePath);
  const variantValues = [variant.varian_1_nilai, variant.varian_2_nilai]
    .map(optionalText)
    .filter((value): value is string => value !== undefined)
    .join(" / ");
  return {
    includedInSeed: isVerifiedVariant(variant),
    parentProductId,
    sourcePath,
    status: text(variant.status_varian, `variants.${parentProductId}.status_varian`),
    storageKey,
    variantProductId: String(variant.variant_product_id),
    variantValues,
  };
});
await writeFile(
  variantMediaMapOutputPath,
  `${JSON.stringify({ version: 1, mappings: variantMediaMap }, null, 2)}\n`,
  "utf8",
);

const variantCount = seedInput.products.reduce((total, product) => total + product.variants.length, 0);
const mediaCount = seedInput.products.reduce((total, product) => total + product.media.length, 0);
const publicationCounts = [...publishApproval.decisions.values()].reduce(
  (counts: Record<CatalogPublishDecision, number>, decision) => ({
    ...counts,
    [decision]: counts[decision] + 1,
  }),
  { HOLD_CUSTOM_FLOW: 0, PUBLISH_READY_MADE: 0 },
);
console.log(`Shop catalog prepared: ${seedInput.products.length} products, ${variantCount} variants, ${mediaCount} media, ${seedInput.categories.length} categories.`);
console.log(`Skipped ${skippedPlaceholders} placeholder variants without a verified price/stock.`);
console.log(`Owner approval ${publishApproval.approvedAt}: ${publicationCounts.PUBLISH_READY_MADE} publish ready-made, ${publicationCounts.HOLD_CUSTOM_FLOW} hold custom flow; SKU ${publishApproval.skuPolicy}.`);
console.log(`Seed manifest: ${seedOutputPath}`);
console.log(`Variant media map: ${variantMediaMapOutputPath}`);
