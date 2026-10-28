import { describe, expect, it, vi } from "vitest";

import type { Prisma } from "@/generated/prisma/client";
import { assertDatabaseBinding, type DatabaseBindingExpectation } from "@/modules/database-binding/core";
import type { DatabaseBindingRepository } from "@/modules/database-binding/repository";
import { BoundDatabaseService } from "@/modules/database-binding/service";
import { AppError } from "@/modules/shared/errors";

const bindingId = "cde8a654-498f-4217-a7a1-300a2944be9e";
const tx = {} as Prisma.TransactionClient;

class CheckingRepository implements DatabaseBindingRepository {
  marker: unknown = { id: 1, bindingId, tier: "staging" };
  expected: DatabaseBindingExpectation | undefined;

  async withVerifiedBinding<T>(expected: DatabaseBindingExpectation, work: (client: Prisma.TransactionClient) => Promise<T>) {
    this.expected = expected;
    assertDatabaseBinding(expected, this.marker);
    return work(tx);
  }
}

function fixture(overrides: Record<string, string | undefined> = {}, grant = true) {
  const env: Record<string, string | undefined> = {
    NODE_ENV: "production",
    NIUVA_DEPLOYMENT_TIER: "staging",
    NIUVA_PROVIDER_MODE: "sandbox",
    APP_URL: "https://staging.example.test",
    DATABASE_URL: "postgresql://fixture@localhost/niuva_test",
    NIUVA_DATABASE_BINDING_ID: bindingId,
    RESEND_API_KEY: "test-only-resend-config",
    EMAIL_FROM: "noreply@example.test",
    ...overrides,
  };
  const repository = new CheckingRepository();
  const repositoryFactory = vi.fn(() => repository);
  const grantedCapabilities: string[] = [];
  const service = new BoundDatabaseService({
    context: {
      env,
      hasActivationGrant: grant ? (tier, capability) => {
        grantedCapabilities.push(capability);
        return tier === "staging" && ["emailDelivery", "scheduledJobs"].includes(capability);
      } : () => false,
    },
    repositoryFactory,
  });
  return { env, repository, repositoryFactory, service, grantedCapabilities };
}

async function expectUnavailable(work: Promise<unknown>) {
  await expect(work).rejects.toMatchObject({ code: "PROVIDER_UNAVAILABLE", status: 503 });
}

describe("bound database capability service", () => {
  it.each(["outbox", "job"] as const)("denies %s without a recorded activation grant", async (operation) => {
    const { service, repositoryFactory } = fixture({}, false);
    let worked = false;
    await expectUnavailable(service.run(operation, async () => { worked = true; }));
    expect(worked).toBe(false);
    expect(repositoryFactory).not.toHaveBeenCalled();
  });

  it.each([
    { NIUVA_DEPLOYMENT_TIER: "production" },
    { NIUVA_PROVIDER_MODE: "live" },
    { NIUVA_DEPLOYMENT_TIER: "local-test", NODE_ENV: "production" },
    { DATABASE_URL: undefined },
  ])("rejects denied tier, mode or resource before accessing a repository %#", async (overrides) => {
    const { service, repositoryFactory } = fixture(overrides);
    let worked = false;
    await expectUnavailable(service.run("job", async () => { worked = true; }));
    expect(worked).toBe(false);
    expect(repositoryFactory).not.toHaveBeenCalled();
  });

  it.each([undefined, "", "malformed-expected-id"])("rejects invalid expected config before repository access (%s)", async (value) => {
    const { service, repositoryFactory } = fixture({ NIUVA_DATABASE_BINDING_ID: value });
    await expectUnavailable(service.run("job", async () => "must not execute"));
    expect(repositoryFactory).not.toHaveBeenCalled();
  });

  it.each(["outbox", "job"] as const)("passes a matching %s operation the verified transaction handle", async (operation) => {
    const { service, repository, grantedCapabilities } = fixture();
    const effects: string[] = [];
    const result = await service.run(operation, async (client) => {
      expect(client).toBe(tx);
      effects.push(operation);
      return "completed";
    });
    expect(result).toBe("completed");
    expect(effects).toEqual([operation]);
    expect(repository.expected).toEqual({ bindingId, tier: "staging" });
    expect(grantedCapabilities).toEqual([operation === "outbox" ? "emailDelivery" : "scheduledJobs"]);
  });

  it("does not require email configuration for a scheduled database job", async () => {
    const { service } = fixture({ RESEND_API_KEY: undefined, EMAIL_FROM: undefined });
    await expect(service.run("job", async () => "cleanup")).resolves.toBe("cleanup");
  });

  it("requires the existing emailDelivery configuration for outbox operations", async () => {
    const { service, repositoryFactory } = fixture({ RESEND_API_KEY: undefined, EMAIL_FROM: undefined });
    await expectUnavailable(service.run("outbox", async () => "send"));
    expect(repositoryFactory).not.toHaveBeenCalled();
  });

  it.each([null, {}, { id: 1, bindingId, tier: "production" }])("rejects missing, invalid or mismatched database markers %#", async (marker) => {
    const { service, repository } = fixture();
    repository.marker = marker;
    let worked = false;
    await expectUnavailable(service.run("job", async () => { worked = true; }));
    expect(worked).toBe(false);
  });

  it("keeps capability and identity inputs consistent after the caller mutates config", async () => {
    const { env, service, repository } = fixture();
    env.NIUVA_DEPLOYMENT_TIER = "production";
    env.NIUVA_DATABASE_BINDING_ID = "invalid-replacement";
    env.DATABASE_URL = undefined;
    await expect(service.run("job", async () => "completed")).resolves.toBe("completed");
    expect(repository.expected).toEqual({ bindingId, tier: "staging" });
  });

  it("does not reflect repository errors, UUIDs or connection data in a service failure", async () => {
    const { service, repositoryFactory } = fixture();
    const privateDetail = `postgresql://private-user:private-password@private-host/resource ${bindingId}`;
    repositoryFactory.mockImplementation(() => { throw new Error(privateDetail); });
    try {
      await service.run("job", async () => "must not execute");
      expect.fail("repository failure must be rejected");
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect(error).toMatchObject({ code: "PROVIDER_UNAVAILABLE", status: 503 });
      expect(String(error)).not.toContain(privateDetail);
      expect(String(error)).not.toContain(bindingId);
      expect(error).not.toHaveProperty("cause");
    }
  });

  it("sanitizes failures during transactional work", async () => {
    const { service } = fixture();
    await expectUnavailable(service.run("job", async () => { throw new Error("private adapter failure"); }));
  });

  it("rejects an unknown runtime operation instead of treating it as a job", async () => {
    const { service, repositoryFactory } = fixture();
    await expectUnavailable(service.run("unknown" as "job", async () => "must not execute"));
    expect(repositoryFactory).not.toHaveBeenCalled();
  });
});
