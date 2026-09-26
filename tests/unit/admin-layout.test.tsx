import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

type ClerkProviderProps = Readonly<{
  children: ReactNode;
  dynamic?: boolean;
  publishableKey?: string;
}>;

const clerkMocks = vi.hoisted(() => ({
  provider: vi.fn((props: ClerkProviderProps) => props.children),
}));

vi.mock("@clerk/nextjs", () => ({
  ClerkProvider: clerkMocks.provider,
}));

import AdminLayout from "@/app/admin/layout";

afterEach(() => {
  clerkMocks.provider.mockClear();
  vi.unstubAllEnvs();
});

describe("AdminLayout", () => {
  it("enables Clerk dynamic rendering for strict CSP nonce propagation", () => {
    const children = "admin-content";
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_example");

    expect(AdminLayout({ children })).toMatchObject({
      props: {
        dynamic: true,
        publishableKey: "pk_test_example",
        children,
      },
    });
  });

  it("keeps the no-key fallback outside ClerkProvider", () => {
    const children = "admin-content";
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");

    expect(AdminLayout({ children })).toBe(children);
    expect(clerkMocks.provider).not.toHaveBeenCalled();
  });
});
