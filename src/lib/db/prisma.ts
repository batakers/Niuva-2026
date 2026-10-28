import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseEnvironment } from "@/lib/env/server";

type PrismaGlobal = typeof globalThis & {
  niuvaPrismaClient?: PrismaClient;
};

const globalForPrisma = globalThis as PrismaGlobal;
let prismaClient: PrismaClient | undefined;

function createPrismaClient(): PrismaClient {
  const { DATABASE_URL } = getDatabaseEnvironment();
  const adapter = new PrismaPg({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 10_000,
    // Each serverless instance keeps its pool while frozen; a small pool keeps
    // several warm instances inside the runtime role's connection limit.
    max: 4,
  });

  return new PrismaClient({ adapter });
}

export function getPrismaClient(): PrismaClient {
  if (prismaClient !== undefined) {
    return prismaClient;
  }

  prismaClient = globalForPrisma.niuvaPrismaClient ?? createPrismaClient();

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.niuvaPrismaClient = prismaClient;
  }

  return prismaClient;
}
