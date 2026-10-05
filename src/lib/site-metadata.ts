import type { Metadata } from "next";

import { resolveCustomerAppOrigin } from "@/modules/customer-auth/app-origin";

const SITE_NAME = "Niuva";
const SITE_DESCRIPTION =
  "Niuva Inovasi Utama adalah mitra inovasi dan pengembangan produk end-to-end yang membantu perusahaan mengubah ide menjadi solusi teknologi dan produk kreatif bernilai tinggi melalui riset, desain, engineering, prototyping, hingga dukungan manufaktur.";

/**
 * Root metadata (Req 16.4). `metadataBase` comes from the canonical origin of
 * the active deployment tier, like sitemap.ts/robots.ts. It is never guessed:
 * with an invalid or missing origin it is omitted and the build still succeeds.
 */
export function buildRootMetadata(env: Readonly<Record<string, string | undefined>>): Metadata {
  const resolved = resolveCustomerAppOrigin(env);

  return {
    ...(resolved.ok ? { metadataBase: new URL(resolved.origin) } : {}),
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "id_ID",
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
    },
    twitter: {
      card: "summary",
      title: SITE_NAME,
      description: SITE_DESCRIPTION,
    },
  };
}

/**
 * Per-page social metadata (Req 16.4). A page-level `openGraph` replaces the
 * layout's object instead of merging, so siteName/locale/type are repeated
 * here. `url` is relative and resolved against the layout `metadataBase`.
 * No image: no approved asset exists yet.
 */
export function buildPageSocialMetadata(input: {
  readonly title: string;
  readonly description: string;
  readonly path: string;
}): Pick<Metadata, "openGraph" | "twitter"> {
  return {
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "id_ID",
      title: input.title,
      description: input.description,
      url: input.path,
    },
    twitter: {
      card: "summary",
      title: input.title,
      description: input.description,
    },
  };
}
