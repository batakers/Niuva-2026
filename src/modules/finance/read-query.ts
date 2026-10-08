import { z } from "zod";
const schema = z.object({
  page: z.coerce.number().int().min(1).max(1000).catch(1),
  q: z.string().trim().min(1).max(100).refine(value => !/[\u0000-\u001f]/.test(value)).optional().catch(undefined),
  service: z.enum(["ready-made", "custom-print", "b2b"]).optional().catch(undefined),
  status: z.enum(["DRAFT", "ISSUED", "VOID", "SUPERSEDED", "VALID", "REVERSED", "CONFIRMED", "REVIEW", "PENDING", "SETTLED", "REFUNDED", "FAILED", "EXPIRED", "CANCELLED"]).optional().catch(undefined),
  dateFrom: z.iso.date().optional().catch(undefined), dateTo: z.iso.date().optional().catch(undefined),
  category: z.enum(["MATERIALS", "SHIPPING", "OPERATIONS", "OTHER"]).optional().catch(undefined),
});
export type FinanceListQuery = z.infer<typeof schema>;
export function parseFinanceListQuery(input: unknown): FinanceListQuery { const parsed = schema.parse(input && typeof input === "object" ? input : {}); if (parsed.dateFrom && parsed.dateTo && parsed.dateFrom > parsed.dateTo) return { ...parsed, dateFrom: undefined, dateTo: undefined }; return parsed; }
