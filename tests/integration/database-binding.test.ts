import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { Prisma, PrismaClient } from "@/generated/prisma/client";
import { getPrismaClient } from "@/lib/db/prisma";
import { getSafeTestDatabaseUrl } from "@/lib/db/test-safety";
import { PrismaDatabaseBindingRepository } from "@/modules/database-binding/repository";

const prisma = getPrismaClient();
const repository = new PrismaDatabaseBindingRepository(prisma);
const bindingId = randomUUID();
const expected = { bindingId, tier: "staging" } as const;
const scope = `binding-test-${randomUUID()}`;
let ownsMarker = false;

async function probe(tx: Prisma.TransactionClient, key: string) {
  return tx.idempotencyRecord.create({
    data: { scope, idempotencyKey: key, requestHash: "binding-probe", expiresAt: new Date(Date.now() + 60_000) },
  });
}

function signal() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => { resolve = done; });
  return { promise, resolve };
}

function sqlState(error: unknown, depth = 0): string | undefined {
  if (depth > 6 || typeof error !== "object" || error === null) return undefined;
  const record = error as Record<string, unknown>;
  for (const field of ["code", "originalCode"]) {
    const value = record[field];
    if (typeof value === "string" && /^[0-9A-Z]{5}$/.test(value) && !value.startsWith("P")) return value;
  }
  for (const field of ["meta", "cause", "driverAdapterError"]) {
    const value = sqlState(record[field], depth + 1);
    if (value !== undefined) return value;
  }
  return undefined;
}

async function expectSqlState(work: Promise<unknown>, code: string) {
  await work.then(
    () => { expect.fail(`SQL operation must fail with ${code}`); },
    (error: unknown) => { expect(sqlState(error)).toBe(code); },
  );
}

beforeAll(async () => {
  getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL });
  if (await prisma.deploymentDatabaseBinding.findUnique({ where: { id: 1 } })) {
    throw new Error("Database marker belongs to another run; use a fresh isolated test database.");
  }
  await prisma.deploymentDatabaseBinding.create({ data: { id: 1, ...expected } });
  ownsMarker = true;
});

beforeEach(async () => {
  if (!ownsMarker) throw new Error("Test does not own the database marker.");
  const row = await prisma.deploymentDatabaseBinding.findUnique({ where: { id: 1 } });
  if (row !== null && row.bindingId !== bindingId) throw new Error("Foreign marker detected; refusing to replace it.");
  if (row === null) await prisma.deploymentDatabaseBinding.create({ data: { id: 1, ...expected } });
});

afterEach(async () => {
  await prisma.idempotencyRecord.deleteMany({ where: { scope } });
});

afterAll(async () => {
  if (ownsMarker) await prisma.deploymentDatabaseBinding.deleteMany({ where: { id: 1, bindingId } });
});

describe("transaction-bound database identity", () => {
  it("commits a probe only on the matching database", async () => {
    const key = randomUUID();
    const result = await repository.withVerifiedBinding(expected, async (tx) => {
      expect(tx).not.toBe(prisma);
      return probe(tx, key);
    });
    expect(await prisma.idempotencyRecord.findUnique({ where: { id: result.id } })).toMatchObject({ scope, idempotencyKey: key });
  });

  it("rolls back database work when the callback fails", async () => {
    const key = randomUUID();
    await expect(repository.withVerifiedBinding(expected, async (tx) => {
      await probe(tx, key);
      throw new Error("probe rollback");
    })).rejects.toThrow("probe rollback");
    expect(await prisma.idempotencyRecord.count({ where: { scope, idempotencyKey: key } })).toBe(0);
  });

  it.each([
    { bindingId: randomUUID(), tier: "staging" as const },
    { bindingId, tier: "production" as const },
  ])("rejects a mismatched expected identity before any write %#", async (mismatch) => {
    const key = randomUUID();
    await expect(repository.withVerifiedBinding(mismatch, (tx) => probe(tx, key))).rejects.toMatchObject({ reason: "MARKER_MISMATCH" });
    expect(await prisma.idempotencyRecord.count({ where: { scope, idempotencyKey: key } })).toBe(0);
  });

  it("rejects a missing marker before any write", async () => {
    await prisma.deploymentDatabaseBinding.deleteMany({ where: { id: 1, bindingId } });
    const key = randomUUID();
    await expect(repository.withVerifiedBinding(expected, (tx) => probe(tx, key))).rejects.toMatchObject({ reason: "MARKER_MISSING" });
    expect(await prisma.idempotencyRecord.count({ where: { scope, idempotencyKey: key } })).toBe(0);
  });

  it.each(["update", "delete"] as const)("holds the marker lock throughout callback work against %s", async (operation) => {
    const entered = signal();
    const release = signal();
    const held = repository.withVerifiedBinding(expected, async () => { entered.resolve(); await release.promise; });
    try {
      await Promise.race([entered.promise, held.then(() => { throw new Error("callback not entered"); })]);
      await expectSqlState(prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SET LOCAL lock_timeout = '250ms'`;
        if (operation === "update") return tx.$executeRaw`UPDATE "deployment_database_bindings" SET "deployment_tier" = 'production' WHERE "id" = 1`;
        return tx.$executeRaw`DELETE FROM "deployment_database_bindings" WHERE "id" = 1`;
      }), "55P03");
    } finally {
      release.resolve();
      await held;
    }
    expect(await prisma.deploymentDatabaseBinding.findUnique({ where: { id: 1 } })).toMatchObject(expected);
  });

  it("allows two guarded readers to enter callback work together", async () => {
    const first = signal();
    const second = signal();
    const release = signal();
    const held = [first, second].map((entered) => repository.withVerifiedBinding(expected, async () => { entered.resolve(); await release.promise; }));
    try {
      await Promise.race([
        Promise.all([first.promise, second.promise]),
        ...held.map((work) => work.then(() => { throw new Error("callback exited before the barrier"); })),
      ]);
    } finally {
      release.resolve();
      await Promise.all(held);
    }
  }, 10_000);

  it("enforces singleton, tier, UUID and non-null constraints", async () => {
    await expectSqlState(prisma.$executeRaw`INSERT INTO "deployment_database_bindings" ("id", "binding_id", "deployment_tier") VALUES (2, ${randomUUID()}::uuid, 'staging')`, "23514");
    await expectSqlState(prisma.$executeRaw`UPDATE "deployment_database_bindings" SET "deployment_tier" = 'invalid' WHERE "id" = 1`, "23514");
    await expectSqlState(prisma.$executeRaw`UPDATE "deployment_database_bindings" SET "binding_id" = 'invalid'::uuid WHERE "id" = 1`, "22P02");
    await expectSqlState(prisma.$executeRaw`UPDATE "deployment_database_bindings" SET "binding_id" = NULL WHERE "id" = 1`, "23502");
    expect(await prisma.deploymentDatabaseBinding.count()).toBe(1);
  });

  it("locks as a restricted non-owner role while refusing identity changes and deletion", async () => {
    const roleName = `binding_test_${randomUUID().replaceAll("-", "")}`;
    const role = Prisma.raw(`"${roleName}"`);
    let created = false;
    let restricted: PrismaClient | undefined;
    try {
      await prisma.$executeRaw(Prisma.sql`CREATE ROLE ${role} NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
      created = true;
      await prisma.$executeRaw(Prisma.sql`GRANT USAGE ON SCHEMA "public" TO ${role}`);
      await prisma.$executeRaw(Prisma.sql`GRANT SELECT, UPDATE ("id") ON TABLE "deployment_database_bindings" TO ${role}`);
      const url = getSafeTestDatabaseUrl({ TEST_DATABASE_URL: process.env.TEST_DATABASE_URL });
      restricted = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, options: `-c role=${roleName}`, max: 2 }) });
      const restrictedRepository = new PrismaDatabaseBindingRepository(restricted);
      const actors = await restrictedRepository.withVerifiedBinding(expected, (tx) => tx.$queryRaw<Array<{ actor: string }>>`SELECT current_user AS actor`);
      expect(actors).toEqual([{ actor: roleName }]);
      const mutations = [
        Prisma.sql`UPDATE "deployment_database_bindings" SET "binding_id" = ${randomUUID()}::uuid WHERE "id" = 1`,
        Prisma.sql`UPDATE "deployment_database_bindings" SET "deployment_tier" = 'production' WHERE "id" = 1`,
        Prisma.sql`UPDATE "deployment_database_bindings" SET "created_at" = CURRENT_TIMESTAMP WHERE "id" = 1`,
        Prisma.sql`INSERT INTO "deployment_database_bindings" ("id", "binding_id", "deployment_tier") VALUES (1, ${randomUUID()}::uuid, 'staging')`,
        Prisma.sql`DELETE FROM "deployment_database_bindings" WHERE "id" = 1`,
        Prisma.sql`TRUNCATE "deployment_database_bindings"`,
      ];
      for (const mutation of mutations) await expectSqlState(restricted.$executeRaw(mutation), "42501");
      await expectSqlState(restricted.$executeRaw`UPDATE "deployment_database_bindings" SET "id" = 2 WHERE "id" = 1`, "23514");
      expect(await prisma.deploymentDatabaseBinding.findUnique({ where: { id: 1 } })).toMatchObject(expected);
    } finally {
      await restricted?.$disconnect();
      if (created) {
        await prisma.$executeRaw(Prisma.sql`REVOKE SELECT, UPDATE ("id") ON TABLE "deployment_database_bindings" FROM ${role}`);
        await prisma.$executeRaw(Prisma.sql`REVOKE USAGE ON SCHEMA "public" FROM ${role}`);
        await prisma.$executeRaw(Prisma.sql`DROP ROLE ${role}`);
      }
    }
  });
});
