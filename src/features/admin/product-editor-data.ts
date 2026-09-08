export type AdminProductEditorScenario = "ready" | "loading" | "empty" | "error" | "conflict";

export type StockAdjustmentReason = "" | "physical-count" | "damaged-item" | "returned-item" | "correction";

export type ProductEditorFormValues = Readonly<{
  description: string;
  heightCm: string;
  isActive: boolean;
  isPublished: boolean;
  lengthCm: string;
  name: string;
  priceRp: string;
  sku: string;
  slug: string;
  stockOnHand: string;
  stockReason: StockAdjustmentReason;
  variantName: string;
  weightGrams: string;
  widthCm: string;
}>;

export type ProductEditorField = keyof ProductEditorFormValues;
export type ProductEditorErrors = Partial<Record<ProductEditorField, string>>;

export type PreviewProductEditorFixture = Readonly<{
  categoryLabel: string;
  mediaStatus: string;
  mediaSummary: string;
  values: ProductEditorFormValues;
}>;

export const productEditorFields = [
  "name",
  "slug",
  "description",
  "isPublished",
  "variantName",
  "sku",
  "priceRp",
  "weightGrams",
  "lengthCm",
  "widthCm",
  "heightCm",
  "isActive",
  "stockOnHand",
  "stockReason",
] as const satisfies readonly ProductEditorField[];

export const stockAdjustmentReasonOptions = [
  { label: "Pilih alasan", value: "" },
  { label: "Hitung fisik", value: "physical-count" },
  { label: "Barang rusak", value: "damaged-item" },
  { label: "Barang retur", value: "returned-item" },
  { label: "Koreksi data", value: "correction" },
] as const satisfies readonly Readonly<{ label: string; value: StockAdjustmentReason }>[];

const previewProductEditorFixtures = [
  {
    categoryLabel: "Workspace",
    mediaStatus: "Media publik belum terhubung",
    mediaSummary: "Tidak ada gambar, storage key, atau upload yang dimuat pada preview ini.",
    values: {
      description: "Dock modular untuk meja kerja.",
      heightCm: "4.200",
      isActive: true,
      isPublished: true,
      lengthCm: "18.000",
      name: "Dock modular meja",
      priceRp: "185000",
      sku: "EX-DOCK-BLUE",
      slug: "dock-modular-meja",
      stockOnHand: "8",
      stockReason: "",
      variantName: "Biru",
      weightGrams: "320.500",
      widthCm: "12.000",
    },
  },
  {
    categoryLabel: "Display",
    mediaStatus: "Media publik belum terhubung",
    mediaSummary: "Koleksi media dan urutan tampil harus dimuat dari storage publik pada integrasi berikutnya.",
    values: {
      description: "Dudukan kecil untuk menampilkan objek contoh.",
      heightCm: "6.000",
      isActive: true,
      isPublished: true,
      lengthCm: "14.000",
      name: "Dudukan display",
      priceRp: "95000",
      sku: "STK-EX-6024",
      slug: "dudukan-display",
      stockOnHand: "0",
      stockReason: "",
      variantName: "Kecil",
      weightGrams: "180.000",
      widthCm: "10.000",
    },
  },
  {
    categoryLabel: "Workspace",
    mediaStatus: "Media publik belum terhubung",
    mediaSummary: "Preview tidak membuat objek R2 atau mengklaim media produk sudah tersedia.",
    values: {
      description: "Tray untuk komponen kecil di area kerja.",
      heightCm: "3.500",
      isActive: true,
      isPublished: false,
      lengthCm: "20.000",
      name: "Tray komponen",
      priceRp: "120000",
      sku: "EX-TRAY-STD",
      slug: "tray-komponen",
      stockOnHand: "6",
      stockReason: "",
      variantName: "Standar",
      weightGrams: "265.250",
      widthCm: "15.000",
    },
  },
  {
    categoryLabel: "Material",
    mediaStatus: "Media publik belum terhubung",
    mediaSummary: "Alt text, urutan media, dan akses objek tidak dapat diuji tanpa dataset yang diizinkan.",
    values: {
      description: "Swatch material untuk review internal.",
      heightCm: "0.800",
      isActive: true,
      isPublished: true,
      lengthCm: "8.000",
      name: "Material swatch",
      priceRp: "25000",
      sku: "EX-SWATCH-STD",
      slug: "material-swatch",
      stockOnHand: "12",
      stockReason: "",
      variantName: "Standar",
      weightGrams: "45.000",
      widthCm: "5.000",
    },
  },
] as const satisfies readonly PreviewProductEditorFixture[];

const defaultSku = "STK-EX-6024";
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const nonNegativeDecimalPattern = /^\d+(?:\.\d{1,6})?$/;
const nonNegativeIntegerPattern = /^(?:0|[1-9]\d*)$/;
const nonNegativeMoneyPattern = /^\d+$/;

export function getProductEditorFixture(sku: string | null): PreviewProductEditorFixture | null {
  const selectedSku = sku ?? defaultSku;

  return previewProductEditorFixtures.find((fixture) => fixture.values.sku === selectedSku) ?? null;
}

export function createInitialProductEditorValues(
  fixture: PreviewProductEditorFixture,
): ProductEditorFormValues {
  return { ...fixture.values };
}

export function hasProductEditorChanges(
  current: ProductEditorFormValues,
  baseline: ProductEditorFormValues,
  fields: readonly ProductEditorField[] = productEditorFields,
): boolean {
  return fields.some((field) => current[field] !== baseline[field]);
}

export function isStockAdjustmentReason(value: string): value is StockAdjustmentReason {
  return stockAdjustmentReasonOptions.some((option) => option.value === value);
}

export function validateProductEditor(
  values: ProductEditorFormValues,
  initialStockOnHand: string,
): ProductEditorErrors {
  const errors: ProductEditorErrors = {};

  if (values.name.trim().length === 0) errors.name = "Nama produk wajib diisi.";
  if (!slugPattern.test(values.slug.trim())) errors.slug = "Slug memakai huruf kecil, angka, dan tanda hubung.";
  if (values.description.trim().length === 0) errors.description = "Deskripsi produk wajib diisi.";
  if (values.variantName.trim().length === 0) errors.variantName = "Nama varian wajib diisi.";
  if (values.sku.trim().length === 0) errors.sku = "SKU varian wajib diisi.";
  if (!nonNegativeMoneyPattern.test(values.priceRp.trim())) errors.priceRp = "Harga memakai bilangan Rupiah nonnegatif tanpa desimal.";
  if (!nonNegativeDecimalPattern.test(values.weightGrams.trim())) errors.weightGrams = "Berat memakai angka desimal nonnegatif hingga 6 digit pecahan.";

  for (const field of ["lengthCm", "widthCm", "heightCm"] as const) {
    if (values[field].trim().length > 0 && !nonNegativeDecimalPattern.test(values[field].trim())) {
      errors[field] = "Dimensi memakai angka desimal nonnegatif hingga 6 digit pecahan.";
    }
  }

  if (!nonNegativeIntegerPattern.test(values.stockOnHand.trim())) {
    errors.stockOnHand = "Stok memakai bilangan bulat nonnegatif.";
  } else if (values.stockOnHand !== initialStockOnHand && values.stockReason === "") {
    errors.stockReason = "Pilih alasan saat jumlah stok berubah.";
  }

  return errors;
}
