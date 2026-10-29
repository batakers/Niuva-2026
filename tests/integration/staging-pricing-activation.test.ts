import { randomUUID } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import { PrismaDatabaseBindingRepository } from "@/modules/database-binding/repository";
import { CUSTOM_PRINT_V1_PER_UNIT_POLICY } from "@/modules/pricing/policy";
import { activateStagingPricingRule } from "@/modules/pricing/staging-activation";

import { isolatedTestDatabase } from "../helpers/isolated-test-database";

let database: Awaited<ReturnType<typeof isolatedTestDatabase>> | undefined;
let prisma: PrismaClient;
const bindingId = randomUUID();
const expected = { tier: "staging", bindingId } as const;

beforeAll(async () => {
  database = await isolatedTestDatabase("staging");
  prisma = database.prisma;
  if (await prisma.pricingRuleVersion.count() || await prisma.deploymentDatabaseBinding.count()) throw new Error("Pricing activation fixture requires a fresh isolated database.");
  await prisma.deploymentDatabaseBinding.create({ data: { id: 1, bindingId, tier: "staging" } });
}, 90000);

afterAll(async () => { await database?.dispose(); });

const activations = () => prisma.auditLog.count({ where: { action: "pricing-rule.activated" } });

describe("staging pricing activation (isolated database)", () => {
  it("rejects a database whose binding marker does not match, without writing", async () => {
    await expect(activateStagingPricingRule(new PrismaDatabaseBindingRepository(prisma), { tier: "staging", bindingId: randomUUID() }, "PER_UNIT")).rejects.toThrow();
    expect(await prisma.pricingRuleVersion.count()).toBe(0);
  });

  it("requires exactly one active Owner to attribute the approval", async () => {
    await expect(activateStagingPricingRule(new PrismaDatabaseBindingRepository(prisma), expected, "PER_UNIT")).rejects.toMatchObject({ reason: "OWNER_NOT_UNIQUE" });
    expect(await prisma.pricingRuleVersion.count()).toBe(0);
  });

  it("activates the approved rule once, is idempotent, and never switches semantics silently", async () => {
    const owner = await prisma.adminProfile.create({ data: { role: "OWNER", isActive: true, displayName: "Fixture Owner" } });
    const repository = new PrismaDatabaseBindingRepository(prisma);

    const first = await activateStagingPricingRule(repository, expected, "PER_UNIT");
    expect(first).toMatchObject({ code: "CUSTOM_PRINT_V1", version: 1, status: "ACTIVE", idempotent: false, previousStatus: null, quantitySemantics: "PER_UNIT" });
    const row = await prisma.pricingRuleVersion.findUniqueOrThrow({ where: { id: first.id } });
    expect(row).toMatchObject({ status: "ACTIVE", approvedByAdminId: owner.id });
    expect(row.definitionJson).toEqual(CUSTOM_PRINT_V1_PER_UNIT_POLICY);
    expect(await activations()).toBe(1);

    expect(await activateStagingPricingRule(repository, expected, "PER_UNIT")).toMatchObject({ id: first.id, idempotent: true });
    expect(await activations()).toBe(1);

    await expect(activateStagingPricingRule(repository, expected, "AGGREGATE")).rejects.toMatchObject({ code: "CONFLICT" });
    expect(await prisma.pricingRuleVersion.findUniqueOrThrow({ where: { id: first.id } })).toMatchObject({ status: "ACTIVE" });
    expect((await prisma.pricingRuleVersion.findUniqueOrThrow({ where: { id: first.id } })).definitionJson).toEqual(CUSTOM_PRINT_V1_PER_UNIT_POLICY);
    expect(await prisma.pricingRuleVersion.count()).toBe(1);
    expect(await activations()).toBe(1);
  });
});
