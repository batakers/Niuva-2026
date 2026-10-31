import { redirect } from "next/navigation";
import { legacyServiceSlugs, publicServices } from "@/features/public/company-content";

/** Compatibility for previously shared links; B2B contact now starts on services. */
export default async function RetiredProjectBriefPage({ searchParams }: Readonly<{
  searchParams: Promise<{ service?: string | string[] }>;
}>) {
  const { service } = await searchParams;
  const slug = typeof service === "string" ? legacyServiceSlugs[service] ?? service : undefined;
  const selected = slug ? publicServices.find(item => item.slug === slug) : undefined;
  redirect(selected ? `/services/${selected.slug}` : "/services");
}
