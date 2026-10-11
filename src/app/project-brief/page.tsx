import { redirect } from "next/navigation";
import { publicServices } from "@/features/public/company-content";

/** Compatibility for previously shared links; B2B contact now starts on services. */
export default async function RetiredProjectBriefPage({ searchParams }: Readonly<{
  searchParams: Promise<{ service?: string | string[] }>;
}>) {
  const { service } = await searchParams;
  const selected = typeof service === "string" ? publicServices.find(item => item.slug === service) : undefined;
  redirect(selected ? `/services/${selected.slug}` : "/services");
}
