import { describe, expect, it } from "vitest";
import { businessEnvelope, parseBusinessPolicy } from "@/modules/outbox/business-core";

const id = "7614b2eb-6e0c-4a27-9162-e94fb377ebd4";
const base = { from: "Niuva <fixture@example.test>", to: "customer@example.test", appOrigin: "https://app.example.test" };
const content = { reference: "TEST-ORDER-001", accountPath: `/account/orders/${id}` };
describe("minimum business email content and policy", () => {
  it("requires explicit bounded policy and never invents a delivery lifetime", () => {
    expect(() => parseBusinessPolicy(undefined)).toThrow(); expect(() => parseBusinessPolicy({})).toThrow();
    for (const maxAgeMs of [0, -1, Infinity, 86400001]) expect(() => parseBusinessPolicy({ maxAgeMs, runBudgetMs: 15000 })).toThrow();
    expect(parseBusinessPolicy({ maxAgeMs: 86400000, runBudgetMs: 15000 })).toEqual({ maxAgeMs: 86400000, runBudgetMs: 15000 });
    expect(parseBusinessPolicy({ maxAgeMs: 3600000, runBudgetMs: 15000 })).toEqual({ maxAgeMs: 3600000, runBudgetMs: 15000 });
  });
  it("requires an explicit run budget that the single projection transaction can honour", () => {
    expect(() => parseBusinessPolicy({ maxAgeMs: 3600000 })).toThrow();
    for (const runBudgetMs of [0, -1, 1.5, Infinity, 20001]) expect(() => parseBusinessPolicy({ maxAgeMs: 3600000, runBudgetMs })).toThrow();
    expect(parseBusinessPolicy({ maxAgeMs: 3600000, runBudgetMs: 20000 })).toEqual({ maxAgeMs: 3600000, runBudgetMs: 20000 });
  });
  it("renders received/shipped messages from record facts without claiming payment or delivery ETA", () => {
    const received = businessEnvelope({ ...base, purpose: "ORDER_RECEIVED", content });
    expect(received.subject).toContain(content.reference); expect(received.text).toContain(`https://app.example.test${content.accountPath}`);
    expect(received.text).not.toMatch(/lunas|produksi selesai|tiba besok/i);
    const shipped = businessEnvelope({ ...base, purpose: "ORDER_SHIPPED", content });
    expect(shipped.text).toContain("telah dikirim"); expect(shipped.text).not.toMatch(/r2|token=|signature=|pasti tiba/i);
  });
  it("preserves integer rupiah beyond JavaScript safe integer precision", () => {
    const envelope = businessEnvelope({ ...base, purpose: "PAYMENT_CONFIRMED", content: { ...content, amountRp: "9007199254740993", paymentPurpose: "CUSTOM_SHIPPING" } });
    expect(envelope.text).toContain("9.007.199.254.740.993"); expect(envelope.text).toContain("ongkir final");
  });
  it("names the quote version and uses the owned MAKE route without a quote token", () => {
    const envelope = businessEnvelope({ ...base, purpose: "QUOTE_AVAILABLE", content: { reference: "TEST-QUOTE-001", version: 3, accountPath: `/account/make/${id}` } });
    expect(envelope.subject).toContain("versi 3"); expect(envelope.text).toContain(`/account/make/${id}`); expect(envelope.text).not.toMatch(/\/quote\/|token|harga otomatis|sudah dibayar/i);
  });
  it("rejects injected headers, private/public capability URLs and cross-purpose content", () => {
    for (const accountPath of ["https://private.example.test/file", "/quote/private-token", `/account/orders/${id}?token=secret`, `//evil.test/account/orders/${id}`]) {
      expect(() => businessEnvelope({ ...base, purpose: "ORDER_RECEIVED", content: { ...content, accountPath } })).toThrow();
    }
    expect(() => businessEnvelope({ ...base, purpose: "ORDER_RECEIVED", content: { ...content, reference: "TEST\r\nBcc: other@example.test" } })).toThrow();
    expect(() => businessEnvelope({ ...base, purpose: "PAYMENT_CONFIRMED", content })).toThrow();
    expect(() => businessEnvelope({ ...base, purpose: "QUOTE_AVAILABLE", content: { ...content, version: 3 } })).toThrow();
    expect(() => businessEnvelope({ ...base, purpose: "ORDER_RECEIVED", content: { ...content, privateUrl: "https://private.example.test/file" } })).toThrow();
  });
});
