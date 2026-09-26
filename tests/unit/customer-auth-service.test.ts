import { describe, expect, it } from "vitest";

import { parseGoogleIdentity } from "@/modules/customer-auth/core";
import { CustomerAuthService } from "@/modules/customer-auth/service";
import type {
  CustomerAuthRepositoryPort,
  CustomerProfile,
} from "@/modules/customer-auth/repository";

const customer: CustomerProfile = {
  avatarUrl: null,
  displayName: "Customer Example",
  email: "customer@example.com",
  id: "9f1c1d28-8b5f-4a9c-b6f6-21b7f9c12999",
  normalizedEmail: "customer@example.com",
};

function createRepository() {
  const sessions: Array<{
    customerId: string;
    expiresAt: Date;
    tokenHash: string;
  }> = [];
  const repository: CustomerAuthRepositoryPort = {
    async createSession(input) {
      sessions.push(input);
    },
    async findCustomerBySessionTokenHash() {
      return customer;
    },
    async getAccount() {
      return null;
    },
    async revokeSession() {},
    async upsertGoogleCustomer() {
      return customer;
    },
  };

  return { repository, sessions };
}

describe("customer auth service", () => {
  it("creates a 30-day opaque session and stores only its hash", async () => {
    const { repository, sessions } = createRepository();
    const now = new Date("2026-09-25T10:00:00.000Z");
    const identity = parseGoogleIdentity({
      email: customer.email,
      email_verified: true,
      name: customer.displayName,
      sub: "google-sub-123",
    });
    const result = await new CustomerAuthService({
      now: () => now,
      randomToken: () => "opaque-session-token",
      repository,
    }).completeGoogleLogin(identity);

    expect(result.customer).toEqual(customer);
    expect(result.expiresAt).toEqual(new Date("2026-10-25T10:00:00.000Z"));
    expect(result.sessionToken).toBe("opaque-session-token");
    expect(sessions).toEqual([
      {
        customerId: customer.id,
        expiresAt: new Date("2026-10-25T10:00:00.000Z"),
        tokenHash: expect.not.stringMatching("opaque-session-token"),
      },
    ]);
  });
});
