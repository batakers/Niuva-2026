import "server-only";
import { z } from "zod";
import type { AdminAccess } from "@/lib/auth/admin";
import { parseWithValidation } from "@/modules/shared/validation";
import { parseFinanceListQuery } from "./read-query";
import { invoiceListTx, paymentListTx, providerPaymentViewTx } from "./read-repository";
import { invoiceViewTx } from "./invoice-service";
import { manualPaymentViewTx } from "./manual-payment-service";
import { ExpenseService } from "./expense-service";
import { billingCaseView, withFinanceTransaction } from "./repository";
import { readBillingSource, sourceKey } from "./source";
import { billingSourceSchema } from "./schema";
import { readFinanceSummary } from "./summary";
export class FinanceReadService {
  async invoices(access: AdminAccess, input: unknown) { const query = parseFinanceListQuery(input); return withFinanceTransaction(access, "FINANCE_READ", tx => invoiceListTx(tx, query)); }
  async invoice(access: AdminAccess, id: string) { const uuid = parseWithValidation(z.uuid(), id); return withFinanceTransaction(access, "FINANCE_READ", tx => invoiceViewTx(tx, uuid)); }
  async payments(access: AdminAccess, input: unknown) { const query = parseFinanceListQuery(input); return withFinanceTransaction(access, "FINANCE_READ", tx => paymentListTx(tx, query)); }
  async payment(access: AdminAccess, id: string) { const uuid = parseWithValidation(z.uuid(), id); return withFinanceTransaction(access, "FINANCE_READ", async tx => (await providerPaymentViewTx(tx, uuid)) ?? manualPaymentViewTx(tx, uuid)); }
  async expenses(access: AdminAccess, input: unknown) { return new ExpenseService().list(access, input); }
  async summary(access: AdminAccess, range: unknown, now = new Date()) { return readFinanceSummary(access, range, now); }
  async source(access: AdminAccess, input: unknown) {
    const source = parseWithValidation(billingSourceSchema, input);
    return withFinanceTransaction(access, "FINANCE_READ", async tx => {
      const snapshot = await readBillingSource(tx, source), row = await tx.billingCase.findUnique({ where: { sourceKey: sourceKey(source) } });
      return { snapshot, billingCase: row ? await billingCaseView(tx, row) : null };
    });
  }
}
