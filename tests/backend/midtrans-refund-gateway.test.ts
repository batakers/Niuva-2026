import { createHash } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import { MidtransRefundGateway } from "@/modules/refund/gateway";

const key = "synthetic-refund-server-key", now = new Date("2026-10-19T05:00:00.000Z");
const target = { providerOrderId: "TEST-REFUND-001", providerTransactionId: "test-transaction-001", amountRp: "100000" };
const command = { ...target, refundKey: "rf_test_operation", reason: "Pengembalian dana penuh disetujui", route: "refund" as const };
function payload(extra: Record<string, unknown> = {}) {
  const body = { order_id: target.providerOrderId, transaction_id: target.providerTransactionId, status_code: "200", gross_amount: "100000.00", payment_type: "gopay", transaction_status: "refund", refund_amount: "100000.00", refund_key: command.refundKey, refund_chargeback_id: "test-bank-1", ...extra };
  return { ...body, signature_key: createHash("sha512").update(`${body.order_id}${body.status_code}${body.gross_amount}${key}`).digest("hex") };
}
function fixture(body: unknown = payload(), status = 200) {
  const fetcher = vi.fn<typeof fetch>(async () => Response.json(body, { status }));
  const config = { serverKey: key, isProduction: false, nodeEnv: "test" as const, capabilityEnv: { NIUVA_PROVIDER_MODE: "sandbox" }, fetch: fetcher, now: () => now };
  return { gateway: new MidtransRefundGateway(config), fetcher, config };
}
describe("Midtrans full refund adapter", () => {
  it.each(["refund", "refund/online/direct"] as const)("posts %s with frozen key, exact server amount, safe reason and transaction ID", async route => {
    const { gateway, fetcher } = fixture();
    expect(await gateway.submit({ ...command, route }, new AbortController().signal)).toEqual({ kind: "accepted", reference: "test-bank-1" });
    expect(fetcher).toHaveBeenCalledWith(`https://api.sandbox.midtrans.com/v2/${target.providerTransactionId}/${route}`, expect.objectContaining({ method: "POST", redirect: "error", cache: "no-store", headers: expect.objectContaining({ Authorization: `Basic ${Buffer.from(key + ":").toString("base64")}` }) }));
    expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toEqual({ refund_key: command.refundKey, amount: 100000, reason: command.reason });
  });
  it("does not mark a submission accepted as final even if its response claims bank confirmation", async () => {
    const { gateway } = fixture(payload({ bank_confirmed_at: "2026-10-19 11:59:00" }));
    expect(await gateway.submit(command, new AbortController().signal)).toEqual({ kind: "accepted", reference: "test-bank-1" });
  });
  it.each([{ refund_key: "foreign" }, { refund_amount: "50000.00" }, { order_id: "foreign" }, { transaction_id: "foreign" }, { transaction_status: "partial_refund" }])("holds unexpected submission identity/amount/status %#", async change => {
    expect(await fixture(payload(change)).gateway.submit(command, new AbortController().signal)).toMatchObject({ kind: "unknown" });
  });
  it("distinguishes documented rejection from duplicate ID or unclassified failures", async () => {
    expect(await fixture({ status_code: "414" }).gateway.submit(command, new AbortController().signal)).toEqual({ kind: "rejected", category: "INVALID_AMOUNT" });
    expect(await fixture(payload({ status_code: "202", transaction_status: "settlement", refund_amount: "0.00" })).gateway.submit(command, new AbortController().signal)).toEqual({ kind: "rejected", category: "BANK_DENIED" });
    for (const status_code of ["406", "412", "500"]) expect(await fixture({ status_code }).gateway.submit(command, new AbortController().signal)).toMatchObject({ kind: "unknown" });
  });
  it("uses authenticated Get Status and requires matching complete bank evidence", async () => {
    const refunds = [{ refund_key: command.refundKey, refund_chargeback_id: "test-bank-1", refund_amount: "100000.00", bank_confirmed_at: "2026-10-19 11:59:00" }];
    const { gateway, fetcher } = fixture(payload({ refunds }));
    expect(await gateway.getStatus(target, new AbortController().signal)).toMatchObject({ kind: "found", proof: { kind: "CONFIRMED" } });
    expect(fetcher.mock.calls[0][0]).toBe(`https://api.sandbox.midtrans.com/v2/${target.providerTransactionId}/status`);
    expect(await fixture({ ...payload({ refunds }), signature_key: "0".repeat(128) }).gateway.getStatus(target, new AbortController().signal)).toMatchObject({ kind: "unavailable" });
  });
  it("keeps 404, network failure, malformed/oversized response and ignored abort unknown", async () => {
    expect(await fixture({}, 404).gateway.getStatus(target, new AbortController().signal)).toEqual({ kind: "not-found" });
    const { config } = fixture();
    const failing = new MidtransRefundGateway({ ...config, fetch: async () => { throw new Error("private-provider-detail"); } });
    expect(await failing.submit(command, new AbortController().signal)).toMatchObject({ kind: "unknown" });
    const oversized = new MidtransRefundGateway({ ...config, fetch: async () => new Response("x".repeat(16385)) });
    expect(await oversized.submit(command, new AbortController().signal)).toMatchObject({ kind: "unknown" });
    const hanging = new MidtransRefundGateway({ ...config, fetch: () => new Promise<Response>(() => {}) });
    expect(await hanging.submit(command, AbortSignal.timeout(20))).toMatchObject({ kind: "unknown", reason: "TIMEOUT" });
  });
  it("rejects unsafe route and production/live configuration before outbound allocation", async () => {
    const { config, fetcher } = fixture();
    await expect(new MidtransRefundGateway({ ...config, isProduction: true }).submit(command, new AbortController().signal)).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    await expect(new MidtransRefundGateway({ ...config, nodeEnv: "production" }).getStatus(target, new AbortController().signal)).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE" });
    await expect(new MidtransRefundGateway(config).submit({ ...command, route: "https://foreign.example.test" }, new AbortController().signal)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
