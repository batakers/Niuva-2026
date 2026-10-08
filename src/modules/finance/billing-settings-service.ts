import "server-only";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { AdminAccess } from "@/lib/auth/admin";
import { appError } from "@/modules/shared/errors";
import { parseWithValidation } from "@/modules/shared/validation";
import { billingInstructionsSchema } from "./schema";
import { financeAudit, withFinanceTransaction } from "./repository";
const saveSchema = z.object({ expectedVersion: z.number().int().min(0), values: billingInstructionsSchema }).strict();
export async function loadBillingInstructions(tx: Prisma.TransactionClient) {
  const row = await tx.billingInstructions.findUnique({ where: { scope: "DEFAULT" }, select: { version: true, valuesJson: true } });
  return row ? { version: row.version, values: parseWithValidation(billingInstructionsSchema, row.valuesJson) } : { version: 0, values: null };
}
export class BillingSettingsService {
  async load(access: AdminAccess) { return withFinanceTransaction(access, "FINANCE_READ", loadBillingInstructions); }
  async save(access: AdminAccess, input: unknown) {
    return withFinanceTransaction(access, "BILLING_SETTINGS_MANAGE", async tx => {
      const parsed = parseWithValidation(saveSchema, input);
      const current = await tx.billingInstructions.findUnique({ where: { scope: "DEFAULT" }, select: { id: true, version: true } });
      if ((current?.version ?? 0) !== parsed.expectedVersion) throw appError("CONFLICT", { message: "Pengaturan sudah berubah. Muat ulang sebelum menyimpan." });
      const version = parsed.expectedVersion + 1;
      const row = current ? await tx.billingInstructions.update({ where: { id: current.id }, data: { valuesJson: parsed.values, version, updatedByAdminId: access.profile.id } }) : await tx.billingInstructions.create({ data: { scope: "DEFAULT", valuesJson: parsed.values, version, updatedByAdminId: access.profile.id } });
      await tx.billingInstructionsRevision.create({ data: { instructionsId: row.id, version, valuesJson: parsed.values, actorId: access.profile.id } });
      await financeAudit(tx, access, "BillingInstructions", row.id, "finance.settings.updated", { version });
      return { version };
    });
  }
}
