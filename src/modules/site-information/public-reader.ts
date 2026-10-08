import "server-only";
import { unstable_cache } from "next/cache";
import { defaultSiteInformation } from "./defaults";
import { loadSiteInformation } from "./repository";
import type { PublicSiteInformation, SiteInformationSnapshot } from "./types";
export const SITE_INFORMATION_TAG = "niuva-public-site-information";
export async function readPublicSiteInformation(read: () => Promise<SiteInformationSnapshot> = loadSiteInformation): Promise<PublicSiteInformation> {
  try { return (await read()).values; } catch { return defaultSiteInformation; }
}
// This project keeps Cache Components disabled. Only the public DTO is cached;
// cookies, session state and customer records never enter this function.
export const getPublicSiteInformation = unstable_cache(() => readPublicSiteInformation(), ["niuva-public-site-information-v1"], { tags: [SITE_INFORMATION_TAG], revalidate: 300 });
