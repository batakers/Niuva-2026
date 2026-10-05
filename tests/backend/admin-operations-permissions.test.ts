import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PrismaClient } from "@/generated/prisma/client";
import type { AdminAccess } from "@/lib/auth/clerk";
import type { AdminPermission } from "@/modules/admin/permissions";

const required = vi.hoisted(() => ({ calls: [] as string[] }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/clerk", () => ({ requireAdmin: vi.fn() }));
vi.mock("@/lib/db/prisma", () => ({ getPrismaClient: vi.fn() }));
vi.mock("@/modules/admin/permissions", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/modules/admin/permissions")>();
  return {
    ...actual,
    requireAdminPermission: (access: AdminAccess, permission: AdminPermission) => {
      required.calls.push(permission);
      return actual.requireAdminPermission(access, permission);
    },
  };
});

import { AdminOperationsService } from "@/modules/admin/operations";

function access(role: "ADMIN" | "OWNER", isActive = true): AdminAccess {
  return {
    clerkUserId: `user_${role.toLowerCase()}`,
    profile: {
      clerkUserId: `user_${role.toLowerCase()}`,
      id: "2b7f3c1a-18f7-4d91-8b86-8d98fcd0f7f4",
      isActive,
      role,
    },
  };
}

/** Prisma stub: any delegate returns empty data; counts every touch. */
function prismaStub() {
  const touched = vi.fn();
  const delegate = new Proxy({}, {
    get: (_target, method) => (...args: unknown[]) => {
      touched(method, args);
      if (method === "findMany") return Promise.resolve([]);
      if (method === "aggregate") return Promise.resolve({ _sum: { quantity: 0 } });
      return Promise.resolve(null);
    },
  });
  const client = new Proxy({}, {
    get: (_target, name) => {
      if (name === "$transaction") {
        return (callback: (tx: unknown) => Promise<unknown>) => callback(client);
      }
      return delegate;
    },
  });
  return { client: client as unknown as PrismaClient, touched };
}

const ID = "7d1e4c2a-0f6b-4b1e-9a55-3c2f7a9d1e10";

const OPERATIONS: ReadonlyArray<
  readonly [string, AdminPermission, (service: AdminOperationsService) => Promise<unknown>]
> = [
  ["listOrders", "ORDER_FULFILL", (s) => s.listOrders()],
  ["getOrder", "ORDER_FULFILL", (s) => s.getOrder(ID)],
  ["listCustomPrintRequests", "CUSTOM_PRINT_REVIEW", (s) => s.listCustomPrintRequests()],
  ["getCustomPrintRequest", "CUSTOM_PRINT_REVIEW", (s) => s.getCustomPrintRequest(ID)],
  ["listProducts", "CATALOG_WRITE", (s) => s.listProducts()],
  ["getProduct", "CATALOG_WRITE", (s) => s.getProduct(ID)],
  ["getStockHistory", "AUDIT_READ", (s) => s.getStockHistory(ID, ID)],
  ["listPortfolio", "PORTFOLIO_WRITE", (s) => s.listPortfolio()],
  ["getPortfolio", "PORTFOLIO_WRITE", (s) => s.getPortfolio(ID)],
  ["listInquiries", "INQUIRY_MANAGE", (s) => s.listInquiries()],
  ["getInquiry", "INQUIRY_MANAGE", (s) => s.getInquiry(ID)],
  ["listPricingRules", "AUDIT_READ", (s) => s.listPricingRules()],
  ["getActivePricingRule", "AUDIT_READ", (s) => s.getActivePricingRule()],
];

describe("AdminOperationsService per-operation permission", () => {
  beforeEach(() => {
    required.calls.length = 0;
  });

  it.each(OPERATIONS)("%s rejects a missing admin before touching the database", async (_name, _permission, run) => {
    const { client, touched } = prismaStub();
    const service = new AdminOperationsService({
      authorize: async () => {
        throw new Error("UNAUTHENTICATED");
      },
      prisma: client,
    });

    await expect(run(service)).rejects.toThrow("UNAUTHENTICATED");
    expect(touched).not.toHaveBeenCalled();
  });

  it.each(OPERATIONS)("%s rejects an inactive admin before touching the database", async (_name, permission, run) => {
    const { client, touched } = prismaStub();
    const service = new AdminOperationsService({ authorize: async () => access("OWNER", false), prisma: client });

    await expect(run(service)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(required.calls).toEqual([permission]);
    expect(touched).not.toHaveBeenCalled();
  });

  it.each(OPERATIONS)("%s checks its documented permission and allows OWNER and ADMIN", async (_name, permission, run) => {
    for (const role of ["OWNER", "ADMIN"] as const) {
      required.calls.length = 0;
      const { client } = prismaStub();
      const service = new AdminOperationsService({ authorize: async () => access(role), prisma: client });

      await expect(run(service)).resolves.not.toThrow();
      expect(required.calls).toEqual([permission]);
    }
  });
});
