import type { Prisma } from "@/generated/prisma/client";
import { appError } from "@/modules/shared/errors";

export async function databaseNow(tx: Prisma.TransactionClient): Promise<Date> {
  const rows = await tx.$queryRaw<{ milliseconds: number }[]>`SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::double precision AS "milliseconds"`;
  const milliseconds = rows[0]?.milliseconds;
  if (typeof milliseconds !== "number" || !Number.isSafeInteger(milliseconds) || !Number.isFinite(new Date(milliseconds).getTime())) throw appError("PROVIDER_UNAVAILABLE");
  return new Date(milliseconds);
}
