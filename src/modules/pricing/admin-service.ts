import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { z } from "zod";
import { requireAdmin, type AdminAccess } from "@/lib/auth/clerk";
import { getPrismaClient } from "@/lib/db/prisma";
import { assertDevelopmentDatabaseUrl } from "@/modules/admin/provisioning";
import { requireAdminPermission } from "@/modules/admin/permissions";
import {
  recordAudit,
  type AuditRecorder,
} from "@/modules/shared/audit";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";

import {
  CUSTOM_PRINT_V1_PER_UNIT_POLICY,
  CUSTOM_PRINT_V1_RULE_CODE,
  CUSTOM_PRINT_V1_RULE_VERSION,
  customPrintPricingPolicySchema,
  type CustomPrintPricingPolicy,
} from "./policy";

export const pricingRuleActivationInputSchema = customPrintPricingPolicySchema
  .pick({ quantitySemantics: true })
  .extend({
    confirmation: z.literal("I_UNDERSTAND_NON_PRODUCTION"),
  })
  .strict();

export type PricingRuleActivationInput = z.infer<
  typeof pricingRuleActivationInputSchema
>;

type QuantitySemantics = CustomPrintPricingPolicy["quantitySemantics"];

export type PricingRuleActivationResult = Readonly<{
  code: string;
  id: string;
  idempotent: boolean;
  previousStatus: "ACTIVE" | "DRAFT" | "RETIRED" | null;
  quantitySemantics: QuantitySemantics;
  status: "ACTIVE";
  version: number;
}>;

type PricingRuleRecord = Readonly<{
  definitionJson: unknown;
  id: string;
  status: "ACTIVE" | "DRAFT" | "RETIRED";
}>;

type PricingRuleRepository = Readonly<{
  activate(input: Readonly<{
    approvedByAdminId: string;
    definitionJson: Prisma.InputJsonObject;
    quantitySemantics: QuantitySemantics;
  }>): Promise<PricingRuleActivationResult>;
}>;

type AuthorizeAdmin = () => Promise<AdminAccess>;

export type PricingRuleAdminServiceDependencies = Readonly<{
  audit?: AuditRecorder;
  authorizeAdmin?: AuthorizeAdmin;
  environmentSource?: Readonly<Record<string, string | undefined>>;
  repository?: PricingRuleRepository;
}>;

/**
 * Pricing activation is intentionally limited to the local development DB.
 * A copied confirmation value must never turn this mutation into a production
 * configuration mechanism.
 */
export function assertPricingRuleDevelopmentEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
): void {
  if (source.NODE_ENV === "production") {
    throw appError("LOCAL_SETUP_DISABLED", {
      message: "Aktivasi pricing rule hanya tersedia di development lokal.",
    });
  }

  try {
    assertDevelopmentDatabaseUrl(source.DATABASE_URL);
  } catch {
    throw appError("LOCAL_SETUP_DISABLED", {
      message:
        "Aktivasi pricing rule hanya boleh memakai PostgreSQL development loopback.",
    });
  }
}

export class PricingRuleAdminService {
  private readonly audit?: AuditRecorder;
  private readonly authorizeAdmin: AuthorizeAdmin;
  private readonly environmentSource: Readonly<
    Record<string, string | undefined>
  >;
  private readonly repositoryFactory: () => PricingRuleRepository;

  constructor(dependencies: PricingRuleAdminServiceDependencies = {}) {
    this.audit = dependencies.audit;
    this.authorizeAdmin = dependencies.authorizeAdmin ?? requireAdmin;
    this.environmentSource = dependencies.environmentSource ?? process.env;
    this.repositoryFactory = () =>
      dependencies.repository ?? new PrismaPricingRuleRepository();
  }

  async activate(input: unknown): Promise<PricingRuleActivationResult> {
    const parsed = parseWithValidation(pricingRuleActivationInputSchema, input);
    const admin = await this.authorizeAdmin();
    requireAdminPermission(admin, "PRICING_RULE_ACTIVATE");
    assertPricingRuleDevelopmentEnvironment(this.environmentSource);

    const definition = customPrintPricingPolicySchema.parse({
      ...CUSTOM_PRINT_V1_PER_UNIT_POLICY,
      quantitySemantics: parsed.quantitySemantics,
    });
    const definitionJson = toInputJsonObject(definition);
    const result = await this.repositoryFactory().activate({
      approvedByAdminId: admin.profile.id,
      definitionJson,
      quantitySemantics: definition.quantitySemantics,
    });

    if (!result.idempotent) {
      await recordAudit(this.audit, {
        action: "pricing-rule.activated",
        actorId: admin.profile.id,
        actorType: "ADMIN",
        afterJson: {
          code: result.code,
          definition: definitionJson,
          status: result.status,
          version: result.version,
        },
        beforeJson: result.previousStatus === null
          ? undefined
          : { status: result.previousStatus },
        entityId: result.id,
        entityType: "PricingRuleVersion",
        metadata: {
          quantitySemantics: result.quantitySemantics,
          operation: "activate-development",
        },
      });
    }

    return result;
  }
}

class PrismaPricingRuleRepository implements PricingRuleRepository {
  constructor(private readonly prisma: PrismaClient = getPrismaClient()) {}

  async activate(input: Readonly<{
    approvedByAdminId: string;
    definitionJson: Prisma.InputJsonObject;
    quantitySemantics: QuantitySemantics;
  }>): Promise<PricingRuleActivationResult> {
    return this.prisma.$transaction(async (transaction) => {
      const otherActive = await transaction.pricingRuleVersion.findFirst({
        where: {
          code: CUSTOM_PRINT_V1_RULE_CODE,
          status: "ACTIVE",
          version: { not: CUSTOM_PRINT_V1_RULE_VERSION },
        },
        select: { id: true },
      });

      if (otherActive !== null) {
        throw appError("CONFLICT", {
          message:
            "Masih ada versi CUSTOM_PRINT_V1 lain yang aktif; pensiunkan versi tersebut terlebih dahulu.",
        });
      }

      const existing = await transaction.pricingRuleVersion.findUnique({
        where: {
          code_version: {
            code: CUSTOM_PRINT_V1_RULE_CODE,
            version: CUSTOM_PRINT_V1_RULE_VERSION,
          },
        },
        select: { definitionJson: true, id: true, status: true },
      });

      const existingRecord: PricingRuleRecord | null = existing === null
        ? null
        : {
            definitionJson: existing.definitionJson,
            id: existing.id,
            status: existing.status,
          };

      if (existingRecord?.status === "ACTIVE") {
        const current = customPrintPricingPolicySchema.safeParse(
          existingRecord.definitionJson,
        );

        if (
          current.success &&
          current.data.quantitySemantics === input.quantitySemantics
        ) {
          return {
            code: CUSTOM_PRINT_V1_RULE_CODE,
            id: existingRecord.id,
            idempotent: true,
            previousStatus: "ACTIVE",
            quantitySemantics: input.quantitySemantics,
            status: "ACTIVE",
            version: CUSTOM_PRINT_V1_RULE_VERSION,
          };
        }

        throw appError("CONFLICT", {
          message:
            "CUSTOM_PRINT_V1 sudah aktif dengan quantity semantics berbeda; tidak diubah diam-diam.",
        });
      }

      const row = existing === null
        ? await transaction.pricingRuleVersion.create({
            data: {
              approvedAt: new Date(),
              approvedByAdminId: input.approvedByAdminId,
              code: CUSTOM_PRINT_V1_RULE_CODE,
              definitionJson: input.definitionJson,
              status: "ACTIVE",
              version: CUSTOM_PRINT_V1_RULE_VERSION,
            },
            select: { id: true, status: true },
          })
        : await transaction.pricingRuleVersion.update({
          data: {
              approvedAt: new Date(),
              approvedByAdminId: input.approvedByAdminId,
              definitionJson: input.definitionJson,
              status: "ACTIVE",
            },
            where: { id: existing.id },
            select: { id: true, status: true },
          });

      return {
        code: CUSTOM_PRINT_V1_RULE_CODE,
        id: row.id,
        idempotent: false,
        previousStatus: existingRecord?.status ?? null,
        quantitySemantics: input.quantitySemantics,
        status: "ACTIVE",
        version: CUSTOM_PRINT_V1_RULE_VERSION,
      };
    });
  }
}

function toInputJsonObject(value: CustomPrintPricingPolicy): Prisma.InputJsonObject {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
}
