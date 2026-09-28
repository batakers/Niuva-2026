import { timingSafeEqual } from "node:crypto";
import { AnalyticsService } from "@/modules/analytics/service";

export async function GET(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  const givenBytes = Buffer.from(given);
  const expectedBytes = Buffer.from(expected);
  if (givenBytes.length !== expectedBytes.length || !timingSafeEqual(givenBytes, expectedBytes)) {
    return new Response(null, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const deleted = await new AnalyticsService().deleteExpired();
    return Response.json({ deleted }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Retensi belum dapat dijalankan." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
