import { stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import type { CatalogSeedInput } from "./seed";

/** Every mapped product image must be a file under public/; the catalog never points at missing media. */
export async function assertCatalogMediaFilesExist(input: CatalogSeedInput, publicRoot: string): Promise<void> {
  const root = resolve(publicRoot);
  for (const product of input.products) {
    for (const media of product.media) {
      const assetPath = resolve(root, ...media.storageKey.split("/"));
      const relativePath = relative(root, assetPath);
      if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
        throw new Error(`Mapping media tidak berada di public/: ${media.storageKey}.`);
      }
      try {
        const asset = await stat(assetPath);
        if (!asset.isFile()) throw new Error("not a file");
      } catch {
        throw new Error(`Asset media belum tersedia untuk mapping ${media.storageKey}.`);
      }
    }
  }
}
