import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { appError } from "@/modules/shared/errors";

const brandRuntimePath = path.join(
  process.cwd(),
  "src",
  "app",
  "auis",
  "_data",
  "brand.runtime.json",
);

const brandInputSchema = z
  .object({
    configured: z.boolean().optional().default(false),
    logo: z
      .string()
      .trim()
      .regex(/^\/assets\/brand\/(?:[A-Za-z0-9._-]+\/)*[A-Za-z0-9._-]+$/)
      .refine(
        (value) =>
          value.split("/").every((segment) => segment !== "." && segment !== ".."),
        { message: "Logo path must not contain relative segments." },
      ),
    name: z.string().trim().min(1).max(80),
    tagline: z.string().trim().min(1).max(500),
  })
  .strict();

export type BrandRuntimeInput = z.infer<typeof brandInputSchema>;

export function parseBrandRuntimeInput(value: unknown): BrandRuntimeInput {
  const result = brandInputSchema.safeParse(value);

  if (!result.success) {
    throw appError("VALIDATION_ERROR", {
      message:
        "Nama produk, positioning, dan path logo publik yang aman wajib diisi.",
    });
  }

  return result.data;
}

export async function writeBrandRuntime(
  input: BrandRuntimeInput,
): Promise<void> {
  await mkdir(path.dirname(brandRuntimePath), { recursive: true });
  await writeFile(
    brandRuntimePath,
    `${JSON.stringify(input, null, 2)}\n`,
    "utf8",
  );
}
