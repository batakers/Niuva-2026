import { z } from "zod";

const requiredText = z.string().trim().min(1);
const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const publicMediaStorageKey = z
  .string()
  .trim()
  .regex(/^media\/portfolio\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:png|jpe?g|webp)$/i, {
    message: "Media portfolio harus memakai key publik yang diizinkan.",
  });

export const updatePortfolioProjectSchema = z
  .object({
    challenge: requiredText.optional(),
    clientName: z.string().trim().min(1).nullable().optional(),
    isFeatured: z.boolean().optional(),
    isPublished: z.boolean().optional(),
    process: requiredText.optional(),
    result: requiredText.optional(),
    serviceLabel: requiredText.optional(),
    slug: slug.optional(),
    summary: requiredText.optional(),
    title: requiredText.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field portfolio harus diubah.",
  });

export const replacePortfolioMediaSchema = z.object({
  items: z
    .array(
      z.object({
        altText: requiredText,
        sortOrder: z.int().nonnegative(),
        storageKey: publicMediaStorageKey,
      }),
    )
    .max(12),
});

export type UpdatePortfolioProjectInput = z.infer<
  typeof updatePortfolioProjectSchema
>;
export type ReplacePortfolioMediaInput = z.infer<
  typeof replacePortfolioMediaSchema
>;
