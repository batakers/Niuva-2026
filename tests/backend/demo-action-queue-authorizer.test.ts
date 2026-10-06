import { describe, expect, it } from "vitest";

import { createDemoActionQueueAuthorizer } from "@/app/demo/action-queue/demo-authorizer";
import { ActionQueueService } from "@/modules/admin/action-queue-service";

const demoEnv = {
  NODE_ENV: "development",
  NIUVA_RUNTIME_MODE: "demo",
  DATABASE_URL: "postgresql://niuva_dev@127.0.0.1:55433/niuva_dev",
} as const;
const hostedEnv = {
  NODE_ENV: "production",
  NIUVA_RUNTIME_MODE: "demo",
  DATABASE_URL: "postgresql://app@db.example.test/niuva",
} as const;

describe("demo action queue authorizer", () => {
  it("lets the service list through a synthetic active AUDIT_READ access in demo mode", async () => {
    let reads = 0;
    const service = new ActionQueueService({
      authorize: createDemoActionQueueAuthorizer(demoEnv),
      repository: {
        async listSignals() {
          reads += 1;
          return [];
        },
      },
    });

    await expect(service.list()).resolves.toMatchObject({ items: [] });
    expect(reads).toBe(1);

    const access = await createDemoActionQueueAuthorizer(demoEnv)();
    expect(access.authUserId).toMatch(/^demo-fake-/);
    expect(access.profile.id).toMatch(/^demo-fake-/);
    expect(access.profile.isActive).toBe(true);
  });

  it("fails closed outside demo mode and produces no synthetic access", async () => {
    let reads = 0;
    const authorize = createDemoActionQueueAuthorizer(hostedEnv);
    const service = new ActionQueueService({
      authorize,
      repository: {
        async listSignals() {
          reads += 1;
          return [];
        },
      },
    });

    await expect(authorize()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(service.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(reads).toBe(0);
  });

  it("keeps the service permission check in force", async () => {
    let reads = 0;
    const service = new ActionQueueService({
      authorize: async () => ({
        authUserId: "demo-fake-clerk-user",
        profile: { id: "demo-fake-admin-profile", authUserId: "demo-fake-clerk-user", isActive: false, role: "ADMIN" },
      }),
      repository: {
        async listSignals() {
          reads += 1;
          return [];
        },
      },
    });

    await expect(service.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(reads).toBe(0);
  });
});
