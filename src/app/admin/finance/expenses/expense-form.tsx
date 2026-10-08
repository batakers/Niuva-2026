"use client";
import { FinanceActionForm, type FinanceFormField } from "@/components/niuva/finance-action-form";
import { EXPENSE_CATEGORIES } from "@/modules/finance/expense-categories";
import type { ExpenseView } from "@/modules/finance/types";
import type { AdminAction } from "@/app/admin/actions";
export function ExpenseForm({ action, idempotencyKey, expense }: Readonly<{ action: AdminAction; idempotencyKey: string; expense?: ExpenseView }>) {
  const fields: FinanceFormField[] = [{ name: "expenseDate", label: "Tanggal pengeluaran", type: "date", required: true, value: expense?.date ?? "" }, { name: "category", label: "Kategori", type: "select", required: true, value: expense?.category ?? "MATERIALS", options: Object.entries(EXPENSE_CATEGORIES).map(([value, label]) => ({ value, label })) }, { name: "amountRp", label: "Nominal pengeluaran (Rp)", required: true, value: expense?.amountRp ?? "", help: "Rupiah utuh, tanpa titik atau koma." }, { name: "description", label: "Keterangan pengeluaran", type: "textarea", required: true, maxLength: 1000, value: expense?.description ?? "" }, ...(expense ? [{ name: "reason", label: "Alasan koreksi", type: "textarea" as const, required: true }] : [])];
  return <FinanceActionForm action={action} fields={fields} hidden={{ idempotencyKey, ...(expense ? { expenseId: expense.id, expectedVersion: String(expense.version) } : {}) }} submitLabel={expense ? "Simpan koreksi pengeluaran" : "Catat pengeluaran"} confirmMessage={expense ? "Terapkan koreksi ini? Catatan asli dan alasan koreksi tetap tersimpan." : undefined} />;
}
