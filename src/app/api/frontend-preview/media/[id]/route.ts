import { readFile } from "node:fs/promises";
import { basename, isAbsolute, relative, resolve } from "node:path";
import { resolveCuratedMediaPath } from "@/features/frontend-preview/media";

export const runtime = "nodejs";

function notFoundResponse() {
  return new Response(null, {
    status: 404,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const assetPath = resolveCuratedMediaPath(process.env.NODE_ENV, id);
  if (!assetPath) return notFoundResponse();

  const proofRoot = resolve(process.cwd(), "docs/content/media-proofs/featured-covers");
  const absolutePath = resolve(proofRoot, basename(assetPath));
  const pathWithinRoot = relative(proofRoot, absolutePath);
  if (pathWithinRoot.startsWith("..") || isAbsolute(pathWithinRoot)) return notFoundResponse();

  try {
    const content = await readFile(absolutePath);
    return new Response(new Uint8Array(content), {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "image/png",
        "X-Content-Type-Options": "nosniff",
        "X-Robots-Tag": "noindex, nofollow",
      },
    });
  } catch {
    return notFoundResponse();
  }
}
