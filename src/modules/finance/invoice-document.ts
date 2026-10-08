import { parseWithValidation } from "@/modules/shared/validation";
import { appError } from "@/modules/shared/errors";
import { financialSnapshotSchema } from "./schema";
import { sumMoney } from "./money";
import type { BillingInstructionsValues, BillingSourceSnapshot, InvoiceFinancialSnapshot } from "./types";
export function buildInvoiceFinancialSnapshot(source: BillingSourceSnapshot, issuer: BillingInstructionsValues, terms: Readonly<{ mode: "FULL" | "DEPOSIT_BALANCE"; depositRp: string | null; depositDueDate: string | null; balanceDueDate: string | null }>): InvoiceFinancialSnapshot {
  if (sumMoney(source.items.map(item => item.amountRp)) !== source.totalRp) throw appError("CONFLICT", { message: "Rincian tagihan belum sesuai total sumber. Periksa sumber pekerjaan." });
  return parseWithValidation(financialSnapshotSchema, { issuer, sourceReference: source.reference, sourceKind: source.source.kind, items: source.items, totalRp: source.totalRp, ...terms });
}
