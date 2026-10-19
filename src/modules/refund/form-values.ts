import type { RefundFormState } from "./types";

export function refundFormValues(data: FormData): NonNullable<RefundFormState["values"]> {
  const value = (name: string, max: number) => { const field = data.get(name); return typeof field === "string" ? field.slice(0, max) : ""; };
  return { reason: value("reason", 1000), category: value("category", 30), returnState: value("returnState", 30), reference: value("reference", 200), receivedAt: value("receivedAt", 40) };
}
