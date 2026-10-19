import { z } from "zod";
import { isPublicMediaKey } from "@/modules/public-media/schema";
import { portfolioServiceCategories } from "@/features/public/company-content";

const requiredText = z.string().trim().min(1);
const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

export const createPortfolioProjectSchema = z.object({
  title: requiredText.max(240),
  slug: slug.max(240),
  summary: requiredText.max(2000),
  serviceLabel: z.enum(portfolioServiceCategories),
  challenge: z.string().trim().max(12000).default(""),
  process: z.string().trim().max(12000).default(""),
  result: z.string().trim().max(12000).default(""),
  clientName: z.string().trim().min(1).max(240).nullable().default(null),
  isPublished: z.literal(false).default(false),
  isFeatured: z.literal(false).default(false),
}).strict();

export type CreatePortfolioProjectInput = z.infer<typeof createPortfolioProjectSchema>;
const publicMediaStorageKey = z
  .string()
  .trim()
  .refine(key => isPublicMediaKey(key, "portfolio"), {
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
