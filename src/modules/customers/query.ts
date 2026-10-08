import { z } from "zod";
import type { CustomerDirectoryQuery } from "./types";

const schema = z.object({
  page: z.preprocess(value => typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value, z.number().int().min(1).max(1000)).catch(1),
  q: z.string().trim().min(1).max(100).refine(value => !/[\u0000-\u001f\u007f]/.test(value)).optional().catch(undefined),
  tab: z.enum(["orders", "custom-print", "inquiries", "invoices"]).catch("orders"),
});
export function parseCustomerDirectoryQuery(raw: unknown): CustomerDirectoryQuery { return schema.parse(raw && typeof raw === "object" ? raw : {}); }
