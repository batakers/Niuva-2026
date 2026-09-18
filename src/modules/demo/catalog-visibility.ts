import { LOCAL_DEMO_PRODUCT_SLUG } from "./seed";

/**
 * Local checkout fixtures may share a loopback database with Owner catalog
 * data, but they must only cross the public catalog boundary in explicit demo
 * mode.
 */
export function isCatalogProductVisibleForRuntime(
  slug: string,
  localDemoMode: boolean,
): boolean {
  return localDemoMode || slug !== LOCAL_DEMO_PRODUCT_SLUG;
}
