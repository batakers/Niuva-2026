import { Prisma, type PrismaClient } from "../../generated/prisma/client";
import { assertDatabaseBinding, readDatabaseBindingExpectation, type DatabaseBindingExpectation } from "./core";

export interface DatabaseBindingRepository {
  withVerifiedBinding<T>(expected: DatabaseBindingExpectation, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

export class PrismaDatabaseBindingRepository implements DatabaseBindingRepository {
  constructor(private readonly client: PrismaClient) {}

  async withVerifiedBinding<T>(expected: DatabaseBindingExpectation, work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    const snapshot = readDatabaseBindingExpectation({ NIUVA_DATABASE_BINDING_ID: expected.bindingId }, expected.tier);
    return this.client.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<unknown[]>(Prisma.sql`
        SELECT "id", "binding_id" AS "bindingId", "deployment_tier" AS "tier"
        FROM "deployment_database_bindings" WHERE "id" = 1 FOR SHARE
      `);
      assertDatabaseBinding(snapshot, rows[0]);
      return work(tx);
    });
  }
}
