import { z } from "zod";

const requiredText = z.string().trim().min(1);

export const checkoutAddressSchema = z.object({
  addressLine: requiredText,
  biteshipAreaId: requiredText.optional(),
  city: requiredText,
  countryCode: z.string().trim().length(2).default("ID"),
  district: requiredText.optional(),
  phone: requiredText,
  postalCode: requiredText,
  province: requiredText,
  recipientName: requiredText,
});

export const checkoutInputSchema = z
  .object({
    address: checkoutAddressSchema,
    customerEmail: z.email(),
    customerName: requiredText,
    customerPhone: requiredText,
    idempotencyKey: z
      .string()
      .trim()
      .min(8)
      .max(128)
      .regex(/^[A-Za-z0-9._~-]+$/),
    items: z
      .array(
        z.object({
          quantity: z.int().positive(),
          variantId: z.uuid(),
        }),
      )
      .min(1)
      .max(50),
    shippingOptionId: requiredText,
  })
  .superRefine((input, context) => {
    const variantIds = input.items.map((item) => item.variantId);

    if (new Set(variantIds).size !== variantIds.length) {
      context.addIssue({
        code: "custom",
        message: "Satu variant hanya boleh muncul sekali dalam checkout.",
        path: ["items"],
      });
    }
  });

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;
export type CheckoutAddress = CheckoutInput["address"];
