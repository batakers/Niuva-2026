import { getPrismaClient } from "@/lib/db/prisma";
import { BoundDatabaseService } from "./service";
import { PrismaDatabaseBindingRepository } from "./repository";

export function createRuntimeBoundDatabase(source: Readonly<Record<string, string | undefined>> = process.env) {
  const env = Object.freeze({ ...source });
  const prisma = getPrismaClient();
  const bound = new BoundDatabaseService({
    context: { env },
    repositoryFactory: () => new PrismaDatabaseBindingRepository(prisma),
  });
  return { env, prisma, bound };
}
