import { z } from "zod";
import { requireAdmin } from "@/lib/auth/admin";
import { assertSameOriginRequest } from "@/lib/security/origin";
import { readJsonBody } from "@/lib/http/body";
import { apiError, apiSuccess } from "@/lib/http/response";
import { parseWithValidation } from "@/modules/shared/validation";
import { FinancialEvidenceService } from "@/modules/finance/evidence-service";
const schema = z.discriminatedUnion("operation", [z.object({ operation: z.literal("prepare"), expenseId: z.uuid(), originalName: z.string().max(180), mimeType: z.string().max(100), sizeBytes: z.number().int().positive() }).strict(), z.object({ operation: z.literal("verify"), expenseId: z.uuid(), fileId: z.uuid(), uploadToken: z.string().max(100) }).strict()]);
const privateHeaders = { "Cache-Control": "no-store", Vary: "Cookie" };
export async function POST(request: Request): Promise<Response> {
  try {
    assertSameOriginRequest(request); const access = await requireAdmin();
    const input = parseWithValidation(schema, await readJsonBody(request, { maxBytes: 4096 })), service = new FinancialEvidenceService();
    const { operation, ...payload } = input;
    const result = operation === "prepare" ? await service.prepare(access, payload) : await service.verifyAndAttach(access, payload);
    return apiSuccess(result, { headers: privateHeaders });
  } catch (error) { const response = apiError(error, undefined, { boundary: "api:POST /api/admin/finance/evidence" }); Object.entries(privateHeaders).forEach(([key, value]) => response.headers.set(key, value)); return response; }
}
export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url), access = await requireAdmin();
    const downloadUrl = await new FinancialEvidenceService().download(access, url.searchParams.get("expenseId") ?? "", url.searchParams.get("fileId") ?? "");
    return new Response(null, { status: 303, headers: { ...privateHeaders, Location: downloadUrl } });
  } catch (error) { const response = apiError(error, undefined, { boundary: "api:GET /api/admin/finance/evidence" }); Object.entries(privateHeaders).forEach(([key, value]) => response.headers.set(key, value)); return response; }
}
