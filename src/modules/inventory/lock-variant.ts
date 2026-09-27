import { Prisma } from "@/generated/prisma/client";
import { appError } from "@/modules/shared/errors";

export type LockedVariant = Readonly<{ id: string; stockOnHand: number }>;

export async function lockVariant(
  transaction: Prisma.TransactionClient,
  variantId: string,
): Promise<LockedVariant> {
  const rows = await transaction.$queryRaw<LockedVariant[]>(
    Prisma.sql`
      SELECT "id", "stock_on_hand" AS "stockOnHand"
      FROM "product_variants"
      WHERE "id" = ${variantId}::uuid
      FOR UPDATE
    `,
  );
  const variant = rows[0];
  if (variant === undefined) throw appError("NOT_FOUND");
  return variant;
}
