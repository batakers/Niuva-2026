import type { PortfolioRepository } from "@/modules/portfolio/repository";
import type { PublicCatalogProduct } from "@/modules/catalog/repository";

// Same public projection as the repository; no admin/private fields added.
export type PublicProject = NonNullable<Awaited<ReturnType<PortfolioRepository["findPublishedProjectBySlug"]>>>;
export type PreviewScenario = "examples" | "empty" | "loading" | "error";
export type ProjectPreviewMode = PreviewScenario | "curated";

export type ProjectPreviewItem = Readonly<{
  id: string;
  slug: string;
  title: string;
  summary: string;
  serviceLabel: string;
  clientName: string | null;
  year: number | null;
  tags: readonly string[];
  detailReadiness: "full-conservative-draft" | "summary-only" | "card-only";
  challenge?: string;
  process?: string;
  result?: string;
  evidenceBoundary?: string;
  media: readonly Readonly<{
    altText: string;
    sortOrder: number;
    previewUrl?: string;
  }>[];
}>;

type CatalogVariant = PublicCatalogProduct["variants"][number];

// Browser-safe rendering projection. Decimal values are serialized and private
// object storage keys are deliberately excluded.
export type PublicShopProduct = Omit<PublicCatalogProduct, "media" | "variants"> & Readonly<{
  media: readonly Readonly<{
    altText: string;
    sortOrder: number;
  }>[];
  variants: readonly Readonly<
    Omit<CatalogVariant, "priceRp" | "weightGrams"> & {
      priceRp: string;
      weightGrams: string;
    }
  >[];
}>;
