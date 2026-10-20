import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { MidtransStatusGateway } from "@/modules/payment/status-gateway";

const key = "synthetic-status-server-key";
const target = { providerOrderId: "TEST-STATUS-001", providerTransactionId: "test-transaction-001" };
function payload(extra: Record<string, unknown> = {}) {
  const body = { order_id: target.providerOrderId, transaction_id: target.providerTransactionId,
    gross_amount: "100000.00", status_code: "200", transaction_status: "settlement", currency: "IDR", ...extra };
  return { ...body, signature_key: createHash("sha512").update(`${body.order_id}${body.status_code}${body.gross_amount}${key}`).digest("hex") };
}
function fixture(body: unknown = payload(), status = 200, config: Record<string, string> = {}) {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(body, { status }));
  const gateway = new MidtransStatusGateway({ serverKey: key, isProduction: false, nodeEnv: "test", capabilityEnv: { NIUVA_PROVIDER_MODE: "sandbox", ...config }, fetch: fetcher });
  return { gateway, fetcher };
}
describe("Midtrans Get Status boundary", () => {
  it("uses transaction identity, Basic auth, no-store, no redirect and a bounded abort signal", async () => {
    const { gateway, fetcher } = fixture();
    expect(await gateway.getStatus(target, AbortSignal.timeout(1000))).toMatchObject({ kind: "found", notification: { grossAmount: "100000.00", transactionStatus: "settlement" } });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://api.sandbox.midtrans.com/v2/test-transaction-001/status");
    expect(init).toMatchObject({ method: "GET", cache: "no-store", redirect: "error" });
    expect(new Headers(init?.headers).get("authorization")).toBe(`Basic ${Buffer.from(key + ":").toString("base64")}`);
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });
  it("uses the stored order reference when a transaction reference is not yet known", async () => {
    const { gateway, fetcher } = fixture();
    await gateway.getStatus({ ...target, providerTransactionId: null }, AbortSignal.timeout(1000));
    expect(fetcher.mock.calls[0]?.[0]).toBe("https://api.sandbox.midtrans.com/v2/TEST-STATUS-001/status");
  });
  it.each([{ order_id: "OTHER-ORDER" }, { transaction_id: "other-transaction" }, { signature_key: "0".repeat(128) }, { currency: "USD" }, { transaction_status: "invented" }])("rejects mismatched or invalid provider facts %j", async extra => {
    const { gateway } = fixture({ ...payload(extra), ...("signature_key" in extra ? extra : {}) });
    expect(await gateway.getStatus(target, AbortSignal.timeout(1000))).toMatchObject({ kind: "unavailable" });
  });
  it("normalizes the documented uppercase DANA status", async () => {
    const { gateway } = fixture(payload({ transaction_status: "PENDING" }));
    expect(await gateway.getStatus(target, AbortSignal.timeout(1000))).toMatchObject({ kind: "found", notification: { transactionStatus: "pending" } });
  });
  it.each([200, 404])("treats provider 404 as unknown, never cancellation (HTTP %s)", async status => {
    const { gateway } = fixture({ status_code: "404", status_message: "not found" }, status);
    expect(await gateway.getStatus(target, AbortSignal.timeout(1000))).toEqual({ kind: "not-found" });
  });
  it("bounds the response and rejects invalid JSON", async () => {
    for (const body of ["not-json", "x".repeat(20000)]) {
      const gateway = new MidtransStatusGateway({ serverKey: key, isProduction: false, nodeEnv: "test", capabilityEnv: { NIUVA_PROVIDER_MODE: "sandbox" }, fetch: async () => new Response(body) });
      expect(await gateway.getStatus(target, AbortSignal.timeout(1000))).toMatchObject({ kind: "unavailable" });
    }
  });
  it("returns unknown when fetch ignores abort and never exposes provider or credential content", async () => {
    const controller = new AbortController();
    const gateway = new MidtransStatusGateway({ serverKey: key, isProduction: false, nodeEnv: "test", capabilityEnv: { NIUVA_PROVIDER_MODE: "sandbox" }, fetch: async () => new Promise<Response>(() => {}) });
    const pending = gateway.getStatus(target, controller.signal); controller.abort();
    const result = await pending;
    expect(result).toEqual({ kind: "unavailable", reason: "TIMEOUT" }); expect(JSON.stringify(result)).not.toContain(key);
  });
  it("carries a bounded provider retry-after without replaying a request", async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response("private provider message", { status: 429, headers: { "retry-after": "60" } }));
    const gateway = new MidtransStatusGateway({ serverKey: key, isProduction: false, nodeEnv: "test", capabilityEnv: { NIUVA_PROVIDER_MODE: "sandbox" }, fetch: fetcher });
    expect(await gateway.getStatus(target, AbortSignal.timeout(1000))).toEqual({ kind: "unavailable", reason: "RATE_LIMITED", retryAfterMs: 60000 }); expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("rejects production, unbound resources and malformed identities before fetching", async () => {
    for (const config of [{ isProduction: true }, { nodeEnv: "production" as const }, { databaseBound: false }]) {
      const fetcher = vi.fn<typeof fetch>();
      const gateway = new MidtransStatusGateway({ serverKey: key, isProduction: false, nodeEnv: "test", capabilityEnv: { NIUVA_PROVIDER_MODE: "sandbox" }, fetch: fetcher, ...config });
      await expect(gateway.getStatus(target, AbortSignal.timeout(1000))).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" }); expect(fetcher).not.toHaveBeenCalled();
    }
    const { gateway, fetcher } = fixture();
    await expect(gateway.getStatus({ ...target, providerOrderId: "../private" }, AbortSignal.timeout(1000))).rejects.toMatchObject({ code: "VALIDATION_ERROR" }); expect(fetcher).not.toHaveBeenCalled();
  });
});
