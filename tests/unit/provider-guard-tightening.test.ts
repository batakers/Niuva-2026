import { describe, expect, it } from "vitest";

import { decide } from "@/modules/capabilities/resolver";
import {
  CAPABILITY_NAMES,
  DEPLOYMENT_TIERS,
  PROVIDER_MODES,
} from "@/modules/capabilities/types";
import {
  PROVIDER_CAPABILITY,
  assertNonProductionProvider,
} from "@/modules/providers/non-production";

// Task 7.6 / Requirement 13.7: whatever the legacy guard rejects for
// NODE_ENV=production, the resolver must also deny, for every tier x mode x
// capability, even with every resource, config group, and policy gate present
// (activation grants stay at their recorded, empty default).

const NODE_ENVS = ["development", "production", "test"] as const;

const COMPLETE_ENV = {
  BITESHIP_API_KEY: "biteship_test.key",
  BITESHIP_COURIERS: "jne",
  BITESHIP_ORIGIN_AREA_ID: "area",
  DATABASE_URL: "postgresql://u:p@localhost:5432/niuva_test",
  EMAIL_FROM: "Niuva <no-reply@example.test>",
  GOOGLE_CLIENT_ID: "id",
  GOOGLE_CLIENT_SECRET: "secret",
  GOOGLE_REDIRECT_URI: "http://localhost:3000/api/auth/google/callback",
  MIDTRANS_IS_PRODUCTION: "false",
  MIDTRANS_SERVER_KEY: "SB-Mid-server-key",
  NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: "SB-Mid-client-key",
  R2_ACCESS_KEY_ID: "a",
  R2_ACCOUNT_ID: "b",
  R2_ENDPOINT: "https://example.r2.cloudflarestorage.com",
  R2_PRIVATE_BUCKET: "private",
  R2_PUBLIC_BUCKET: "public",
  R2_SECRET_ACCESS_KEY: "c",
  RESEND_API_KEY: "re_test",
} as const;

describe("legacy guard vs resolver", () => {
  const rows = NODE_ENVS.flatMap((nodeEnv) =>
    DEPLOYMENT_TIERS.flatMap((tier) =>
      PROVIDER_MODES.flatMap((mode) =>
        CAPABILITY_NAMES.map((capability) => ({ capability, mode, nodeEnv, tier })),
      ),
    ),
  );

  it("resolver never allows what the legacy guard rejects (NODE_ENV x tier x mode x capability)", () => {
    expect(rows.length).toBe(3 * 3 * 3 * CAPABILITY_NAMES.length);

    for (const { capability, mode, nodeEnv, tier } of rows) {
      let legacyRejects = false;

      try {
        assertNonProductionProvider({ nodeEnv, provider: "X" });
      } catch {
        legacyRejects = true;
      }

      const decision = decide(capability, {
        env: {
          ...COMPLETE_ENV,
          NIUVA_DEPLOYMENT_TIER: tier,
          NIUVA_PROVIDER_MODE: mode,
          NODE_ENV: nodeEnv,
        },
        gates: { getStatus: () => ({ closed: true }) },
        // Default (empty) recorded grants: no task grants activation. A future
        // explicit staging grant is the only intended way to lift NODE_ENV=production.
      });

      if (legacyRejects) {
        expect(decision.allowed, `${nodeEnv}/${tier}/${mode}/${capability}`).toBe(false);
      }
    }
  });

  it("legacy guard still rejects production and live providers, and allows otherwise", () => {
    expect(() => assertNonProductionProvider({ nodeEnv: "production", provider: "R2" })).toThrow(
      expect.objectContaining({ code: "PROVIDER_UNAVAILABLE" }),
    );
    expect(() =>
      assertNonProductionProvider({ isLiveProvider: true, nodeEnv: "test", provider: "Midtrans" }),
    ).toThrow(expect.objectContaining({ code: "PROVIDER_UNAVAILABLE" }));
    expect(() => assertNonProductionProvider({ nodeEnv: "test", provider: "R2" })).not.toThrow();
  });

  it("maps every guarded provider label to a registered capability", () => {
    expect(PROVIDER_CAPABILITY).toEqual({
      Biteship: "shipping",
      Midtrans: "payment",
      R2: "objectStorage",
      Resend: "emailDelivery",
      "Resend Customer auth": "emailSender",
    });

    for (const capability of Object.values(PROVIDER_CAPABILITY)) {
      expect(CAPABILITY_NAMES).toContain(capability);
    }
  });
});
