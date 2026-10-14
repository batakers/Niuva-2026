import { describe, expect, it } from "vitest";
import { BoundDatabaseService } from "@/modules/database-binding/service";
import { OutboxPayloadCipher } from "@/modules/outbox/cipher";
import { PrismaOutboxRepository } from "@/modules/outbox/repository";
import { DurableOutboxService } from "@/modules/outbox/service";
import type { Prisma, DurableOutboxMessage } from "@/generated/prisma/client";

const proofId = "9be320fd-d173-4117-a39b-cc45bd9e1178", token = "a".repeat(43);
const input = { kind: "AUTH", proofId, token };
const cipher = new OutboxPayloadCipher({ activeKeyId: "backend-v1", keys: { "backend-v1": Buffer.alloc(32, 12).toString("base64") } });
function denied() {
  let allocated = false;
  const bound = new BoundDatabaseService({ context: { env: { NODE_ENV: "production", NIUVA_DEPLOYMENT_TIER: "staging", NIUVA_PROVIDER_MODE: "sandbox", APP_URL: "https://staging.example.test", DATABASE_URL: "postgresql://fixture@localhost/niuva_test", NIUVA_DATABASE_BINDING_ID: proofId, RESEND_API_KEY: "synthetic-config", EMAIL_FROM: "fixture@example.test" } }, repositoryFactory: () => { allocated = true; throw new Error("factory must remain lazy"); } });
  return { service: new DurableOutboxService({ bound, repository: new PrismaOutboxRepository(), cipherFactory: () => cipher }), allocated: () => allocated };
}
describe("outbox service authority boundary", () => {
  it.each(["enqueue", "producer", "revalidate", "expire"])("denies %s without an activation grant or database allocation", async operation => {
    const f = denied(); let produced = false;
    const work = operation === "enqueue" ? f.service.enqueue(input)
      : operation === "producer" ? f.service.withTransaction(async () => { produced = true; })
      : operation === "revalidate" ? f.service.revalidate(proofId) : f.service.expireBatch();
    await expect(work).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE", status: 503 });
    expect(produced).toBe(false); expect(f.allocated()).toBe(false);
  });
  it.each([null, {}, { ...input, to: "attacker@example.test" }, { ...input, token: "bad" }])("rejects invalid enqueue input without echoing sensitive fields %#", async raw => {
    const f = denied();
    await expect(f.service.enqueue(raw)).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 422 });
    expect(f.allocated()).toBe(false);
  });
  it.each([0, -1, 101, 1.5, Number.NaN, Number.POSITIVE_INFINITY])("rejects invalid cleanup batch size %s", async limit => {
    await expect(denied().service.expireBatch(limit)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("rejects malformed message identity", async () => {
    await expect(denied().service.revalidate("not-a-message-id")).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });
  it("normalizes unexpected boundary failures without leaking their cause", async () => {
    const sensitive = `synthetic ${token} fixture@example.test`;
    const bound: Pick<BoundDatabaseService, "run"> = { async run() { throw new Error(sensitive); } };
    const service = new DurableOutboxService({ bound, repository: new PrismaOutboxRepository(), cipherFactory: () => cipher });
    try { await service.enqueue(input); expect.fail("must fail closed"); }
    catch (error) { expect(error).toMatchObject({ code: "PROVIDER_UNAVAILABLE", status: 503 }); expect(String(error)).not.toContain(sensitive); expect(error).not.toHaveProperty("cause"); }
  });
  it("treats equality at the database deadline as expired and scrubs without reading proof", async () => {
    const now = new Date("2030-01-01T00:15:00Z");
    let row: DurableOutboxMessage = { id: proofId, messageKey: "fixture-message", proofKind: "AUTH", proofId, purpose: "AUTH_VERIFY", templateVersion: "v1", fingerprint: "c".repeat(64), sealedPayload: "encrypted-fixture", createdAt: new Date("2030-01-01T00:00:00Z"), dueAt: new Date("2030-01-01T00:00:00Z"), expiresAt: now, state: "PENDING", attempts: 0, leaseId: null, leaseExpiresAt: null, terminalAt: null, failureCategory: null, providerReference: null };
    class ExpiredRepository extends PrismaOutboxRepository {
      override async lock() {}
      override async now() { return now; }
      override async find() { return row; }
      override async finish(_tx: Prisma.TransactionClient, _id: string, state: "CANCELLED" | "EXPIRED", at: Date) { row = { ...row, state, sealedPayload: null, terminalAt: at }; return row; }
    }
    const bound: Pick<BoundDatabaseService, "run"> = { async run(_operation, work) { return work({} as Prisma.TransactionClient); } };
    const service = new DurableOutboxService({ bound, repository: new ExpiredRepository(), cipherFactory: () => { throw new Error("fixture key unavailable"); } });
    expect(await service.revalidate(proofId)).toMatchObject({ state: "EXPIRED" }); expect(row.sealedPayload).toBeNull();
  });
});
