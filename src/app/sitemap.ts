import type { MetadataRoute } from "next";

import { publicServices } from "@/features/public/company-content";
import { getProjectPreview } from "@/features/frontend-preview/server";
import { resolveCustomerAppOrigin } from "@/modules/customer-auth/app-origin";

// Time-based revalidation (Req 16.3, render-strategy.md). The sitemap is a
// cached Route Handler and reads published portfolio projects, so it refreshes
// on the same 300 s cadence as `/projects`. Must stay a static literal. No
// request-time API is used, so the entry is built once at `next build`.
export const revalidate = 300;

// Indexable public routes only. Deliberately absent (Req 16.7): `/auth-test-policy`,
// `/internal-testing/*`, `/demo/action-queue`, `/api/frontend-preview/media/[id]`,
// `/preview/*`, auth pages, `/cart`, `/checkout`, `/account/*`, token pages,
// and `/admin/*`. `/shop/[slug]` is omitted until a public catalog read path exists.
const STATIC_PATHS = [
  "/",
  "/services",
  "/projects",
  "/shop",
  "/project-brief",
  "/custom-print",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Never guess an origin: without a valid canonical origin there is no
  // absolute URL to publish, and the build must still succeed.
  const resolved = resolveCustomerAppOrigin(process.env);

  if (!resolved.ok) {
    return [];
  }

  const absolute = (path: string): string => new URL(path, resolved.origin).toString();

  const entries: MetadataRoute.Sitemap = [
    ...STATIC_PATHS.map((path) => ({ url: absolute(path) })),
    ...publicServices.map((service) => ({ url: absolute(`/services/${service.slug}`) })),
  ];

  // A database outage or missing database at build time must not fail the
  // build; project URLs are added on the next revalidation.
  const result = await getProjectPreview(undefined).catch(() => null);

  for (const project of result?.projects ?? []) {
    if (project.detailReadiness === "card-only") {
      continue;
    }

    entries.push({ url: absolute(`/projects/${encodeURIComponent(project.slug)}`) });
  }

  return entries;
}
