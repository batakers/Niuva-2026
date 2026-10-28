import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { bootstrapStagingOwner, STAGING_OWNER_CONFIRMATION } from "@/modules/admin/staging-owner-bootstrap";
import { PrismaDatabaseBindingRepository } from "@/modules/database-binding/repository";

import { isolatedTestDatabase } from "../helpers/isolated-test-database";

let database: Awaited<ReturnType<typeof isolatedTestDatabase>> | undefined;
let prisma: PrismaClient;
const bindingId = randomUUID();
const input = (email: string) => ({ email, password: "Test-472!", displayName: "Owner Staging Fixture", confirmation: STAGING_OWNER_CONFIRMATION } as const);

beforeAll(async () => {
  database = await isolatedTestDatabase("staging");
  prisma = database.prisma;
  if (await prisma.adminProfile.count() || await prisma.deploymentDatabaseBinding.count()) throw new Error("Owner bootstrap fixture requires a fresh isolated database.");
  await prisma.deploymentDatabaseBinding.create({ data: { id: 1, bindingId, tier: "staging" } });
}, 90000);

afterAll(async () => { await database?.dispose(); });

describe("staging Owner bootstrap (isolated database)", () => {
  it("rejects a database whose binding marker does not match, without writing", async () => {
    await expect(bootstrapStagingOwner(new PrismaDatabaseBindingRepository(prisma), { tier: "staging", bindingId: randomUUID() }, input("mismatch@example.test"))).rejects.toThrow();
    expect(await prisma.adminAuthUser.count()).toBe(0);
  });

  it("creates exactly one unverified Owner with a credential account, then refuses any further bootstrap", async () => {
    const repository = new PrismaDatabaseBindingRepository(prisma);
    const result = await bootstrapStagingOwner(repository, { tier: "staging", bindingId }, input("owner@example.test"));
    expect(result).toMatchObject({ role: "OWNER", requiresEmailVerification: true });
    const user = await prisma.adminAuthUser.findUniqueOrThrow({ where: { email: "owner@example.test" }, include: { accounts: true, profile: true } });
    expect(user.emailVerified).toBe(false);
    expect(user.accounts.map(account => account.providerId)).toEqual(["credential"]);
    expect(user.accounts[0].password).not.toContain("Test-472!");
    expect(user.profile).toMatchObject({ role: "OWNER", isActive: true, displayName: "Owner Staging Fixture" });

    await expect(bootstrapStagingOwner(repository, { tier: "staging", bindingId }, input("second-owner@example.test"))).rejects.toMatchObject({ reason: "OWNER_EXISTS" });
    expect(await prisma.adminProfile.count({ where: { role: "OWNER" } })).toBe(1);
    expect(await prisma.adminAuthUser.count()).toBe(1);
  });
});
