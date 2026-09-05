import { z } from "zod";

const requiredText = z.string().trim().min(1);
const slug = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const nonNegativeInteger = z.int().nonnegative();
const nonNegativeDecimal = z.string().trim().regex(/^\d+(?:\.\d{1,6})?$/);
const nonNegativeMoney = z.string().trim().regex(/^\d+$/);

export const createProductSchema = z.object({
  categoryId: z.uuid().optional(),
  description: requiredText,
  isPublished: z.boolean().default(false),
  name: requiredText,
  slug,
});

export const updateProductSchema = z
  .object({
    categoryId: z.uuid().nullable().optional(),
    description: requiredText.optional(),
    isPublished: z.boolean().optional(),
    name: requiredText.optional(),
    slug: slug.optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field product harus diubah.",
  });

export const createVariantSchema = z.object({
  heightCm: nonNegativeDecimal.optional(),
  isActive: z.boolean().default(true),
  lengthCm: nonNegativeDecimal.optional(),
  name: requiredText,
  priceRp: nonNegativeMoney,
  productId: z.uuid(),
  sku: requiredText,
  stockOnHand: nonNegativeInteger.default(0),
  weightGrams: nonNegativeDecimal,
  widthCm: nonNegativeDecimal.optional(),
});

export const updateVariantSchema = z
  .object({
    heightCm: nonNegativeDecimal.nullable().optional(),
    isActive: z.boolean().optional(),
    lengthCm: nonNegativeDecimal.nullable().optional(),
    name: requiredText.optional(),
    priceRp: nonNegativeMoney.optional(),
    sku: requiredText.optional(),
    weightGrams: nonNegativeDecimal.optional(),
    widthCm: nonNegativeDecimal.nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Minimal satu field variant harus diubah.",
  });

export const updateStockSchema = z.object({
  stockOnHand: nonNegativeInteger,
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type UpdateStockInput = z.infer<typeof updateStockSchema>;

