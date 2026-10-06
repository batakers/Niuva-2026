import Decimal from "decimal.js";
import { z } from "zod";
import { Prisma, type PrismaClient } from "@/generated/prisma/client";

import { requireAdmin, type AdminAccess } from "@/lib/auth/admin";
import { getPrismaClient } from "@/lib/db/prisma";
import { requireAdminPermission } from "@/modules/admin/permissions";
import { calculatePrintQuote, type StandardPrintInput } from "@/modules/pricing/calculator";
import { parseActiveCustomPrintPricingPolicy } from "@/modules/pricing/policy";
import { roundFinalTotal } from "@/modules/pricing/rounding";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";

import { isModelExtension } from "./file-types";

export const additionalCostSchema = z.object({
  name: z.string().trim().min(2).max(80),
  amountRp: z.string().trim().regex(/^[1-9]\d{0,14}$/),
}).strict();

export const publishEstimateSchema = z.object({
  requestId: z.uuid(),
  pricingRuleVersionId: z.uuid(),
  filamentSource: z.enum(["NIUVA_STOCK", "CUSTOMER_OWN", "COMMUNAL"]),
  additionalCosts: z.array(additionalCostSchema).max(20),
  noAdditionalCosts: z.boolean(),
}).strict().superRefine((value, context) => {
  if (value.noAdditionalCosts !== (value.additionalCosts.length === 0)) {
    context.addIssue({ code: "custom", path: ["additionalCosts"], message: "Nyatakan tidak ada pos tambahan, atau isi semua pos biaya." });
  }
});

export type AdditionalCost = z.infer<typeof additionalCostSchema>;

export function isEstimateCurrent(snapshot: unknown, reviewUpdatedAt: Date | null | undefined): boolean {
  if (reviewUpdatedAt == null) return false;
  const parsed = z.object({ reviewUpdatedAt: z.iso.datetime() }).safeParse(snapshot);
  return parsed.success && parsed.data.reviewUpdatedAt === reviewUpdatedAt.toISOString();
}

export function calculateProductionRange(input: StandardPrintInput, additionalCosts: readonly AdditionalCost[]) {
  const baseline = calculatePrintQuote(input);
  const additionalSubtotalRp = additionalCosts.reduce((sum, cost) => sum.plus(new Decimal(cost.amountRp)), new Decimal(0));
  const unroundedTotalRp = baseline.unroundedTotalRp.plus(additionalSubtotalRp);
  if (!unroundedTotalRp.isFinite() || unroundedTotalRp.lte(0)) {
    throw appError("VALIDATION_ERROR", { message: "Total biaya produksi harus positif." });
  }
  return {
    baseline,
    additionalSubtotalRp,
    unroundedTotalRp,
    lowerRp: roundFinalTotal(unroundedTotalRp),
    upperRp: roundFinalTotal(unroundedTotalRp.times("1.30")),
  };
}

export class CustomPrintEstimateService {
  constructor(private readonly dependencies: Readonly<{
    authorizeAdmin?: () => Promise<AdminAccess>;
    prisma?: PrismaClient;
  }> = {}) {}

  async latestForAdmin(requestId: string) {
    const admin = await (this.dependencies.authorizeAdmin ?? requireAdmin)();
    requireAdminPermission(admin, "QUOTE_MANAGE");
    return (this.dependencies.prisma ?? getPrismaClient()).customPrintEstimate.findFirst({
      where: { requestId }, orderBy: { version: "desc" },
      select: { id: true, version: true, lowerRp: true, upperRp: true, publishedAt: true,
        additionalSubtotalRp: true, snapshot: true },
    });
  }

  async publish(input: unknown) {
    const parsed = parseWithValidation(publishEstimateSchema, input);
    const admin = await (this.dependencies.authorizeAdmin ?? requireAdmin)();
    requireAdminPermission(admin, "QUOTE_MANAGE");
    const prisma = this.dependencies.prisma ?? getPrismaClient();

    return prisma.$transaction(async (transaction) => {
      await transaction.$queryRaw(Prisma.sql`SELECT "id" FROM "custom_print_requests" WHERE "id" = ${parsed.requestId}::uuid FOR UPDATE`);
      const request = await transaction.customPrintRequest.findUnique({
        where: { id: parsed.requestId },
        select: { id: true, status: true,
          files: { select: { file: { select: { extension: true, uploadStatus: true } } } },
          review: { select: { id: true, updatedAt: true, verifiedWeightG: true, printDurationSeconds: true, quantity: true, materialCode: true } },
          estimates: { orderBy: { version: "desc" }, take: 1, select: { version: true } },
        },
      });
      if (request === null) throw appError("NOT_FOUND");
      if (!["QUOTE_READY", "QUOTE_SENT"].includes(request.status) || request.review === null ||
        !request.files.some(({ file }) => file.uploadStatus === "VERIFIED" && isModelExtension(file.extension))) {
        throw appError("QUOTE_NOT_READY", { message: "Model dan review slicer terverifikasi diperlukan sebelum estimasi." });
      }
      const rule = await transaction.pricingRuleVersion.findFirst({
        where: { id: parsed.pricingRuleVersionId, status: "ACTIVE" },
        select: { id: true, code: true, version: true, definitionJson: true },
      });
      if (rule === null) throw appError("PRICING_RULE_NOT_APPROVED");
      const policy = parseActiveCustomPrintPricingPolicy(rule.definitionJson);
      if (rule.code !== policy.code || rule.version !== policy.version) throw appError("PRICING_RULE_NOT_APPROVED");
      if (request.review.materialCode !== "PLA" && request.review.materialCode !== "ABS") {
        throw appError("VALIDATION_ERROR", { message: "Material review tidak didukung Pricing v1." });
      }
      const pricingInput = {
        filamentSource: parsed.filamentSource,
        material: request.review.materialCode,
        policy,
        printDurationSeconds: request.review.printDurationSeconds,
        quantity: request.review.quantity,
        weightGrams: request.review.verifiedWeightG.toString(),
      } as const;
      const calculated = calculateProductionRange(pricingInput, parsed.additionalCosts);
      const snapshot: Prisma.InputJsonObject = {
        factorLower: "1.00", factorUpper: "1.30", calibrated: false,
        reviewId: request.review.id, reviewUpdatedAt: request.review.updatedAt.toISOString(),
        pricingRule: { id: rule.id, code: rule.code, version: rule.version, definition: policy },
        pricingInputs: { filamentSource: pricingInput.filamentSource, material: pricingInput.material,
          printDurationSeconds: pricingInput.printDurationSeconds, quantity: pricingInput.quantity,
          weightGrams: pricingInput.weightGrams },
        additionalCosts: parsed.additionalCosts,
        noAdditionalCosts: parsed.noAdditionalCosts,
        materialSubtotalRp: calculated.baseline.materialSubtotalRp.toString(),
        machineSubtotalRp: calculated.baseline.machineSubtotalRp.toString(),
      };
      const estimate = await transaction.customPrintEstimate.create({
        data: { requestId: request.id, version: (request.estimates[0]?.version ?? 0) + 1,
          pricingRuleVersionId: rule.id, snapshot,
          baselineRp: calculated.baseline.unroundedTotalRp,
          additionalSubtotalRp: calculated.additionalSubtotalRp,
          lowerRp: calculated.lowerRp, upperRp: calculated.upperRp,
          publishedByAdminId: admin.profile.id },
        select: { id: true, requestId: true, version: true, lowerRp: true, upperRp: true },
      });
      await transaction.customPrintQuote.updateMany({
        where: { requestId: request.id, status: "DRAFT" },
        data: { status: "EXPIRED" },
      });
      return estimate;
    });
  }
}
