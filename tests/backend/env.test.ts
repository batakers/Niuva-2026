import { describe, expect, it } from "vitest";
import {
  EnvironmentValidationError,
  getDatabaseEnvironment,
  getServerCapabilities,
  parseServerEnvironment,
  validateStartupEnvironment,
} from "@/lib/env/server";
import {
  getPublicEnvironment,
  PublicEnvironmentValidationError,
} from "@/lib/env/public";

describe("server environment contract", () => {
  it("keeps every provider capability disabled when no values are configured", () => {
    expect(getServerCapabilities({})).toEqual({
      biteship: false,
      clerkAdmin: false,
      customUploads: false,
      database: false,
      midtrans: false,
      objectStorage: false,
      resend: false,
    });
  });

  it("rejects a missing database capability when it is requested", () => {
    expect(() => getDatabaseEnvironment({})).toThrow(
      EnvironmentValidationError,
    );
    expect(() => getDatabaseEnvironment({})).toThrow("DATABASE_URL");
  });

  it("rejects malformed database URL, boolean, and integer values", () => {
    expect(() => parseServerEnvironment({ DATABASE_URL: "https://example.com" })).toThrow(
      "DATABASE_URL",
    );
    expect(() => parseServerEnvironment({ MIDTRANS_IS_PRODUCTION: "yes" })).toThrow(
      "MIDTRANS_IS_PRODUCTION",
    );
    expect(() => parseServerEnvironment({ CUSTOM_FILE_MAX_BYTES: "0" })).toThrow(
      "CUSTOM_FILE_MAX_BYTES",
    );
    expect(() =>
      parseServerEnvironment({ CUSTOM_FILE_MAX_BYTES: "1048576" }),
    ).toThrow("CUSTOM_FILE_MAX_BYTES");
  });

  it("fails startup on a partially configured provider group", () => {
    expect(() =>
      validateStartupEnvironment({ CLERK_SECRET_KEY: "server-only-key" }),
    ).toThrow("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");

    expect(() =>
      validateStartupEnvironment({ BITESHIP_API_KEY: "biteship_test.example" }),
    ).toThrow("BITESHIP_COURIERS");
  });

  it("requires complete R2 setup before enabling a configured upload limit", () => {
    expect(() =>
      validateStartupEnvironment({ CUSTOM_FILE_MAX_BYTES: "104857600" }),
    ).toThrow("R2_ACCOUNT_ID");
  });

  it("enables custom uploads only with complete R2 setup and a reviewed limit", () => {
    const capabilities = getServerCapabilities({
      CUSTOM_FILE_MAX_BYTES: "104857600",
      R2_ACCESS_KEY_ID: "access-key",
      R2_ACCOUNT_ID: "account-id",
      R2_ENDPOINT: "https://account.r2.cloudflarestorage.com",
      R2_PRIVATE_BUCKET: "niuva-private",
      R2_PUBLIC_BUCKET: "niuva-public",
      R2_SECRET_ACCESS_KEY: "secret-key",
    });

    expect(capabilities.objectStorage).toBe(true);
    expect(capabilities.customUploads).toBe(true);
  });
});

describe("public environment contract", () => {
  it("returns an explicit public allow-list without server-only values", () => {
    const environment = getPublicEnvironment({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
      NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: "client-key",
      NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
      SERVER_ONLY_VALUE: "must-not-escape",
    });

    expect(environment).toEqual({
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_123",
      NEXT_PUBLIC_MIDTRANS_CLIENT_KEY: "client-key",
      NEXT_PUBLIC_SENTRY_DSN: "https://public@example.ingest.sentry.io/1",
    });
    expect(environment).not.toHaveProperty("SERVER_ONLY_VALUE");
  });

  it("rejects malformed public URLs", () => {
    expect(() =>
      getPublicEnvironment({ NEXT_PUBLIC_SENTRY_DSN: "not-a-url" }),
    ).toThrow(PublicEnvironmentValidationError);
  });
});
