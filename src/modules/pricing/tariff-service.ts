import "server-only";
import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import type { AdminAccess } from "@/lib/auth/admin";
import { getPrismaClient } from "@/lib/db/prisma";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";
import { assertPricingRuleDevelopmentEnvironment } from "./admin-service";
import { CUSTOM_PRINT_V1_PER_UNIT_POLICY, CUSTOM_PRINT_V1_RULE_CODE, parseActiveCustomPrintPricingPolicy } from "./policy";
import { editableRates, policyFromRates, tariffApplySchema, tariffPreviewSchema } from "./tariff-schema";
import { calculatePrintQuote } from "./calculator";

export class TariffService {
  constructor(private readonly dependencies: { prisma?: PrismaClient; environmentSource?: Readonly<Record<string, string | undefined>> } = {}) {}
  private get prisma() { return this.dependencies.prisma ?? getPrismaClient(); }
  private async transaction<T>(access: AdminAccess, run: (tx: Prisma.TransactionClient) => Promise<T>) {
    requireAdminPermission(access, "PRICING_RULE_ACTIVATE");
    return this.prisma.$transaction(async tx => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('niuva-custom-print-rates'))`;
      await tx.$queryRaw(Prisma.sql`SELECT id FROM admin_profiles WHERE id = ${access.profile.id}::uuid FOR UPDATE`);
      const actor = await tx.adminProfile.findFirst({ where: { id: access.profile.id, role: "OWNER", isActive: true }, select: { authUserId: true } });
      if (!actor || (actor.authUserId !== null && actor.authUserId !== access.authUserId)) throw appError("FORBIDDEN");
      return run(tx);
    });
  }
  async load(access: AdminAccess) { return this.transaction(access, async tx => {
    const current = await active(tx);
    const history = await tx.pricingRuleVersion.findMany({ where: { code: CUSTOM_PRINT_V1_RULE_CODE }, orderBy: { version: "desc" }, take: 30, select: { id: true, version: true, status: true, approvedAt: true, definitionJson: true, approvedByAdmin: { select: { authUser: { select: { name: true } } } } } });
    return { activeId: current?.id ?? null, version: current?.version ?? 0, rates: editableRates(current ? parseActiveCustomPrintPricingPolicy(current.definitionJson) : CUSTOM_PRINT_V1_PER_UNIT_POLICY), history: history.map(row => ({ id: row.id, version: row.version, status: row.status, appliedAt: row.approvedAt?.toISOString() ?? null, actor: row.approvedByAdmin?.authUser?.name ?? "Owner", rates: editableRates(parseActiveCustomPrintPricingPolicy(row.definitionJson)) })), canApply: enabled(this.dependencies.environmentSource) };
  }); }
  async preview(access: AdminAccess, input: unknown) {
    const parsed = parseWithValidation(tariffPreviewSchema, input);
    return this.transaction(access, async tx => {
      const current = await active(tx);
      if ((current?.id ?? null) !== parsed.expectedActiveId) throw appError("CONFLICT", { message: "Tarif aktif berubah. Muat ulang sebelum meninjau." });
      const before = current ? parseActiveCustomPrintPricingPolicy(current.definitionJson) : CUSTOM_PRINT_V1_PER_UNIT_POLICY;
      const next = policyFromRates(parsed.rates, Math.max(2, (current?.version ?? 0) + 1));
      if (current && JSON.stringify(editableRates(before)) === JSON.stringify(parsed.rates)) throw appError("VALIDATION_ERROR", { message: "Belum ada tarif yang diubah." });
      const request = { ...parsed, expectedVersion: current?.version ?? 0, fingerprint: fingerprint(current?.definitionJson ?? null) };
      return { request, before: editableRates(before), after: parsed.rates, samples: [100, 201, 501].map(weight => ({ weight, beforeRp: sample(before, weight), afterRp: sample(next, weight) })) };
    });
  }
  async apply(access: AdminAccess, input: unknown) {
    const parsed = parseWithValidation(tariffApplySchema, input);
    requireAdminPermission(access, "PRICING_RULE_ACTIVATE");
    assertPricingRuleDevelopmentEnvironment(this.dependencies.environmentSource ?? process.env);
    return this.transaction(access, async tx => {
      const current = await active(tx);
      if ((current?.id ?? null) !== parsed.expectedActiveId || (current?.version ?? 0) !== parsed.expectedVersion || fingerprint(current?.definitionJson ?? null) !== parsed.fingerprint) throw appError("CONFLICT", { message: "Tarif berubah sejak ditinjau. Tinjau ulang perubahan." });
      const latest = await tx.pricingRuleVersion.aggregate({ where: { code: CUSTOM_PRINT_V1_RULE_CODE }, _max: { version: true } });
      const next = policyFromRates(parsed.rates, Math.max(2, (latest._max.version ?? 0) + 1));
      if (current) await tx.pricingRuleVersion.update({ where: { id: current.id }, data: { status: "RETIRED" } });
      const row = await tx.pricingRuleVersion.create({ data: { code: next.code, version: next.version, definitionJson: next, status: "ACTIVE", approvedAt: new Date(), approvedByAdminId: access.profile.id } });
      await tx.auditLog.create({ data: { actorType: "ADMIN", actorId: access.profile.id, action: "pricing-rule.applied", entityType: "PricingRuleVersion", entityId: row.id, metadataJson: { version: row.version, previousVersion: current?.version ?? null }, afterJson: next } });
      return { id: row.id, version: row.version };
    });
  }
}
async function active(tx: Prisma.TransactionClient) { const rows = await tx.pricingRuleVersion.findMany({ where: { code: CUSTOM_PRINT_V1_RULE_CODE, status: "ACTIVE" }, take: 2 }); if (rows.length > 1) throw appError("CONFLICT", { message: "Lebih dari satu tarif aktif. Periksa versi sebelum menerapkan perubahan." }); return rows[0] ?? null; }
function fingerprint(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function sample(policy: ReturnType<typeof parseActiveCustomPrintPricingPolicy>, weight: number) { return calculatePrintQuote({ filamentSource: "NIUVA_STOCK", material: "PLA", policy, printDurationSeconds: 3600, quantity: 1, weightGrams: String(weight) }).finalTotalRp.toString(); }
function enabled(source?: Readonly<Record<string, string | undefined>>) { try { assertPricingRuleDevelopmentEnvironment(source ?? process.env); return true; } catch { return false; } }
