import { createHash, randomBytes } from "node:crypto";
import { isSameOriginRequest } from "@/lib/security/origin";
import { createInMemoryRateLimiter } from "@/lib/security/rate-limit";
import { classifyDevice, countryCode, pageViewSchema } from "@/modules/analytics/contract";
import { PrismaAnalyticsRepository, type AnalyticsRepository } from "@/modules/analytics/repository";

const MAX_BODY_BYTES = 512;
const processSalt = randomBytes(32);
const limiter = createInMemoryRateLimiter({ limit: 60, windowMs: 60_000, maxKeys: 10_000 });
const noStore = { "Cache-Control": "no-store" };

async function readBoundedBody(request: Request): Promise<string | "TOO_LARGE" | null> {
  if (request.body === null) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel();
        return "TOO_LARGE";
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  } finally {
    reader.releaseLock();
  }
}

function rateKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim().slice(0, 64) ?? "";
  const ip = request.headers.get("x-real-ip")?.trim().slice(0, 64) ?? forwarded;
  return createHash("sha256").update(processSalt).update(ip || "unknown").digest("hex");
}

export async function handlePageView(
  request: Request,
  repository?: AnalyticsRepository,
): Promise<Response> {
  if (process.env.NIUVA_ANALYTICS_ENABLED !== "true") {
    return new Response(null, { status: 404, headers: noStore });
  }
  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Origin tidak diizinkan." }, { status: 403, headers: noStore });
  }
  if (request.headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
    return Response.json({ error: "Content-Type tidak valid." }, { status: 415, headers: noStore });
  }
  const size = Number(request.headers.get("content-length"));
  if (Number.isFinite(size) && size > MAX_BODY_BYTES) {
    return Response.json({ error: "Payload terlalu besar." }, { status: 413, headers: noStore });
  }
  const limit = limiter.check(rateKey(request));
  if (!limit.allowed) {
    return Response.json(
      { error: "Terlalu banyak permintaan." },
      { status: 429, headers: { ...noStore, "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }
  const body = await readBoundedBody(request);
  if (body === "TOO_LARGE") {
    return Response.json({ error: "Payload terlalu besar." }, { status: 413, headers: noStore });
  }
  if (body === null) {
    return Response.json({ error: "Payload tidak valid." }, { status: 400, headers: noStore });
  }
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(body);
  } catch {
    return Response.json({ error: "JSON tidak valid." }, { status: 400, headers: noStore });
  }
  const payload = pageViewSchema.safeParse(parsedJson);
  if (!payload.success) {
    return Response.json({ error: "Payload tidak valid." }, { status: 400, headers: noStore });
  }
  try {
    await (repository ?? new PrismaAnalyticsRepository()).increment(
      payload.data,
      classifyDevice(request.headers.get("user-agent")),
      countryCode(request.headers.get("x-vercel-ip-country")),
      new Date(),
    );
    return new Response(null, { status: 204, headers: noStore });
  } catch {
    return Response.json({ error: "Pengukuran sementara tidak tersedia." }, { status: 503, headers: noStore });
  }
}

export async function POST(request: Request): Promise<Response> {
  return handlePageView(request);
}
