"use client";

import Image from "next/image";
import { useState } from "react";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Icon } from "@/components/ui/Icon";
import { typographySystemTokens as type } from "@/design/typography";
import type { PublicShopProduct } from "@/features/frontend-preview/types";
import { ProductSelection } from "./product-selection";

type Media = PublicShopProduct["media"][number];

// The catalog import names each variant photo "Foto varian <nama varian>"; only that exact text
// links a photo to a variant, so a choice never jumps to a guessed picture.
function variantPhotoIndex(media: readonly Media[], variantName: string) {
  const wanted = `foto varian ${variantName}`.trim().toLocaleLowerCase("id");
  return media.findIndex(item => item.altText.trim().toLocaleLowerCase("id") === wanted);
}

/**
 * Gallery and decision panel side by side from lg. Choosing a variant shows its own photo when
 * the catalog has one; thumbnails let the visitor look at every photo either way.
 */
export type ProductHeading = Readonly<{
  available: boolean;
  category: string;
  name: string;
  price: string;
  summary: string;
}>;

// The heading arrives as plain data: JSX handed from the server page to this client component
// lost its static-children marker and made React warn about missing keys.
export function ProductShowcase({ heading, previewEnabled, product }: Readonly<{
  heading: ProductHeading;
  previewEnabled: boolean;
  product: PublicShopProduct;
}>) {
  const hydrated = useHydrated();
  const media = product.media.filter(item => item.url !== undefined).sort((a, b) => a.sortOrder - b.sortOrder);
  const [active, setActive] = useState(0);
  const current = media[active] ?? media[0];

  function showVariant(variantId: string) {
    const variant = product.variants.find(item => item.id === variantId);
    if (!variant) return;
    const index = variantPhotoIndex(media, variant.name);
    if (index >= 0) setActive(index);
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-14 xl:gap-20">
      <section aria-label="Foto produk" className="min-w-0">
        <figure>
          <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[var(--radius-media)] border border-border bg-card text-center text-muted-foreground">
            {current?.url ? (
              <Image
                alt={current.altText || product.name}
                className="object-contain"
                fill
                priority
                sizes="(min-width: 1024px) 44rem, 100vw"
                src={current.url}
              />
            ) : (
              <div className="px-6">
                <Icon aria-hidden="true" className="mx-auto size-8" name="image-off" />
                <p className="mt-4 text-ui font-medium text-foreground">Foto produk belum tersedia</p>
              </div>
            )}
          </div>
          {media.length > 1 ? <figcaption className="mt-3 text-caption text-muted-foreground" aria-live="polite">Foto {active + 1} dari {media.length}</figcaption> : null}
        </figure>
        {/* One swipeable row on phones keeps the variant choice close to the photo; a grid from sm. */}
        {media.length > 1 ? (
          <ul className="mt-4 flex gap-2 overflow-x-auto pb-2 sm:grid sm:grid-cols-6 sm:gap-3 sm:overflow-visible sm:pb-0">
            {media.map((item, index) => (
              <li className="w-16 shrink-0 sm:w-auto" key={`${item.sortOrder}-${item.url}`}>
                <button
                  aria-label={`Tampilkan foto ${index + 1}: ${item.altText || product.name}`}
                  aria-pressed={index === active}
                  className="relative block aspect-square w-full cursor-pointer overflow-hidden rounded-[var(--radius-control)] border border-border bg-card transition-colors duration-[var(--duration-fast-token)] hover:border-brand-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-default aria-pressed:border-2 aria-pressed:border-primary"
                  disabled={!hydrated}
                  onClick={() => setActive(index)}
                  type="button"
                >
                  {item.url ? <Image alt="" className="object-contain" fill sizes="7rem" src={item.url} /> : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <div className="min-w-0">
        <p className="text-ui text-muted-foreground">{heading.category}</p>
        <h1 className={`${type.heading.className} mt-2 text-balance`}>{heading.name}</h1>
        <p className="mt-4 max-w-[48ch] text-lead leading-[1.6]">{heading.summary}</p>
        <div className="mt-6 flex flex-wrap items-baseline gap-x-5 gap-y-1">
          <p className="text-2xl font-semibold tabular-nums">{heading.price}</p>
          <p className={`text-ui font-medium ${heading.available ? "text-success" : "text-warning"}`}>{heading.available ? "Tersedia" : "Stok habis"}</p>
        </div>
        <ProductSelection onVariantChange={showVariant} previewEnabled={previewEnabled} product={product} />
      </div>
    </div>
  );
}
