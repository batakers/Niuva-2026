import { afterAll, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { financeActor, financePrisma as prisma } from "./helpers/finance";
import { TariffService } from "@/modules/pricing/tariff-service";
import { CUSTOM_PRINT_V1_PER_UNIT_POLICY, parseActiveCustomPrintPricingPolicy } from "@/modules/pricing/policy";
import { editableRates, policyFromRates } from "@/modules/pricing/tariff-schema";

afterAll(() => prisma.$disconnect());
it("serializes Owner review/apply and retains old policy snapshots", async () => {
  const owner = await financeActor(); const admin = await financeActor("ADMIN");
  // Injected Prisma always targets the isolated TEST DB; this tests the approved
  // development marker independently of the production-disabled environment gate.
  const service = new TariffService({ prisma, environmentSource: { NODE_ENV: "test", DATABASE_URL: "postgresql://test@127.0.0.1:55432/niuva_dev" } });
  const existing = await prisma.pricingRuleVersion.findFirst({ where: { code: "CUSTOM_PRINT_V1", status: "ACTIVE" } });
  const latest = await prisma.pricingRuleVersion.aggregate({ where: { code: "CUSTOM_PRINT_V1" }, _max: { version: true } });
  const version = Math.max(2, (latest._max.version ?? 0) + 1);
  const old = existing ?? await prisma.pricingRuleVersion.create({ data: { code: "CUSTOM_PRINT_V1", version, status: "ACTIVE", definitionJson: policyFromRates(editableRates(CUSTOM_PRINT_V1_PER_UNIT_POLICY), version) } });
  const rates = editableRates(parseActiveCustomPrintPricingPolicy(old.definitionJson)); rates.plaFirst = rates.plaFirst === "1100" ? "1200" : "1100";
  const preview = await service.preview(owner, { rates, expectedActiveId: old.id });
  await expect(service.apply(admin, { ...preview.request, confirmed: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  const results = await Promise.allSettled([service.apply(owner, { ...preview.request, confirmed: true }), service.apply(owner, { ...preview.request, confirmed: true })]);
  expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
  expect(await prisma.pricingRuleVersion.count({ where: { code: "CUSTOM_PRINT_V1", status: "ACTIVE" } })).toBe(1);
  expect(await prisma.pricingRuleVersion.findUnique({ where: { id: old.id } })).toMatchObject({ status: "RETIRED", definitionJson: old.definitionJson });
  const applied = results.find(result => result.status === "fulfilled");
  if (applied?.status === "fulfilled") await prisma.pricingRuleVersion.delete({ where: { id: applied.value.id } });
  if (existing) await prisma.pricingRuleVersion.update({ where: { id: old.id }, data: { status: "ACTIVE" } });
  else await prisma.pricingRuleVersion.delete({ where: { id: old.id } });
});
