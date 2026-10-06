import { describe, expect, it } from "vitest";
import {
  EnvironmentValidationError,
  getDatabaseEnvironment,
  getServerCapabilities,
  parseServerEnvironment,
  validateStartupEnvironment,
} from "@/lib/env/server";

describe("server environment contract", () => {
  it("keeps every provider capability disabled when no values are configured", () => {
    expect(getServerCapabilities({})).toEqual({
      biteship: false,
      adminAuth: false,
      customUploads: false,
      customerGoogle: false,
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

  describe("runtime env registered by task 3.15", () => {
    const validRuntimeEnv = {
      CRON_SECRET: "test-only-cron-secret",
      DEMO_DATABASE_URL: "postgresql://niuva_dev@127.0.0.1:55433/niuva_dev?schema=public",
      NIUVA_ANALYTICS_ENABLED: "true",
      NIUVA_CUSTOMER_AUTH_MOCK: "false",
      NIUVA_NEXT_DIST_DIR: ".next-e2e",
    };

    it("accepts well-formed values", () => {
      expect(parseServerEnvironment(validRuntimeEnv)).toEqual({
        ...validRuntimeEnv,
        NIUVA_ANALYTICS_ENABLED: true,
        NIUVA_CUSTOMER_AUTH_MOCK: false,
      });
      expect(
        parseServerEnvironment({ DEMO_DATABASE_URL: "postgres://localhost/niuva_test" })
          .DEMO_DATABASE_URL,
      ).toBe("postgres://localhost/niuva_test");
    });

    it.each([
      ["NIUVA_ANALYTICS_ENABLED", "yes"],
      ["NIUVA_ANALYTICS_ENABLED", "TRUE"],
      ["NIUVA_CUSTOMER_AUTH_MOCK", "1"],
      ["NIUVA_CUSTOMER_AUTH_MOCK", "maybe"],
      ["DEMO_DATABASE_URL", "https://example.com/niuva_demo"],
      ["DEMO_DATABASE_URL", "not a url"],
    ])("rejects malformed %s=%s and names the field", (field, value) => {
      let error: unknown;
      try {
        parseServerEnvironment({ [field]: value });
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(EnvironmentValidationError);
      expect((error as EnvironmentValidationError).fields).toEqual([field]);
    });

    it("treats blank or missing values as not configured without failing startup", () => {
      const blank = {
        CRON_SECRET: "",
        DEMO_DATABASE_URL: "  ",
        NIUVA_ANALYTICS_ENABLED: "",
        NIUVA_CUSTOMER_AUTH_MOCK: "",
        NIUVA_NEXT_DIST_DIR: "",
      };

      for (const source of [{}, blank]) {
        const environment = validateStartupEnvironment(source);
        expect(environment.CRON_SECRET).toBeUndefined();
        expect(environment.DEMO_DATABASE_URL).toBeUndefined();
        expect(environment.NIUVA_ANALYTICS_ENABLED).toBeUndefined();
        expect(environment.NIUVA_CUSTOMER_AUTH_MOCK).toBeUndefined();
        expect(environment.NIUVA_NEXT_DIST_DIR).toBeUndefined();
      }
    });

    it("does not change startup result or capabilities for an env without the new variables", () => {
      const source = {
        DATABASE_URL: "postgresql://localhost/niuva_dev",
        NIUVA_RUNTIME_MODE: "demo",
        NODE_ENV: "test",
      };

      expect(validateStartupEnvironment(source)).toEqual({
        DATABASE_URL: "postgresql://localhost/niuva_dev",
        NIUVA_RUNTIME_MODE: "demo",
        NODE_ENV: "test",
      });
      expect(validateStartupEnvironment({ ...source, ...validRuntimeEnv })).toMatchObject({
        DATABASE_URL: source.DATABASE_URL,
      });
      expect(getServerCapabilities({ ...source, ...validRuntimeEnv })).toEqual(
        getServerCapabilities(source),
      );
    });

    it("keeps the new variables outside provider capability groups", () => {
      expect(getServerCapabilities(validRuntimeEnv)).toEqual(getServerCapabilities({}));
    });
  });

  describe("internal auth env registered by task 3.16", () => {
    const validInternalAuthEnv = {
      NIUVA_INTERNAL_AUTH_ENABLED: "true",
      NIUVA_INTERNAL_GOOGLE_EMAIL: "google@example.test",
      NIUVA_INTERNAL_PASSWORD_EMAIL: "password@example.test",
    };

    it("accepts well-formed values and trims emails like the previous parser", () => {
      expect(parseServerEnvironment(validInternalAuthEnv)).toEqual({
        NIUVA_INTERNAL_AUTH_ENABLED: true,
        NIUVA_INTERNAL_GOOGLE_EMAIL: "google@example.test",
        NIUVA_INTERNAL_PASSWORD_EMAIL: "password@example.test",
      });
      expect(
        parseServerEnvironment({
          ...validInternalAuthEnv,
          NIUVA_INTERNAL_AUTH_ENABLED: "false",
          NIUVA_INTERNAL_GOOGLE_EMAIL: "  google@example.test  ",
        }),
      ).toMatchObject({
        NIUVA_INTERNAL_AUTH_ENABLED: false,
        NIUVA_INTERNAL_GOOGLE_EMAIL: "google@example.test",
      });
    });

    it.each([
      ["NIUVA_INTERNAL_AUTH_ENABLED", "1"],
      ["NIUVA_INTERNAL_AUTH_ENABLED", "TRUE"],
      ["NIUVA_INTERNAL_AUTH_ENABLED", " true"],
      ["NIUVA_INTERNAL_GOOGLE_EMAIL", "not-an-email"],
      ["NIUVA_INTERNAL_PASSWORD_EMAIL", "missing-at.example.test"],
    ])("rejects malformed %s=%s and names the field", (field, value) => {
      let error: unknown;
      try {
        parseServerEnvironment({ [field]: value });
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(EnvironmentValidationError);
      expect((error as EnvironmentValidationError).fields).toEqual([field]);
    });

    it("treats blank or missing values as not configured without failing startup", () => {
      const blank = {
        NIUVA_INTERNAL_AUTH_ENABLED: "",
        NIUVA_INTERNAL_GOOGLE_EMAIL: "  ",
        NIUVA_INTERNAL_PASSWORD_EMAIL: "",
      };

      for (const source of [{}, blank]) {
        const environment = validateStartupEnvironment(source);
        expect(environment.NIUVA_INTERNAL_AUTH_ENABLED).toBeUndefined();
        expect(environment.NIUVA_INTERNAL_GOOGLE_EMAIL).toBeUndefined();
        expect(environment.NIUVA_INTERNAL_PASSWORD_EMAIL).toBeUndefined();
      }
    });

    it("keeps the internal auth variables outside provider capability groups", () => {
      expect(getServerCapabilities(validInternalAuthEnv)).toEqual(getServerCapabilities({}));
      expect(() => validateStartupEnvironment(validInternalAuthEnv)).not.toThrow();
      expect(() =>
        validateStartupEnvironment({ NIUVA_INTERNAL_AUTH_ENABLED: "true" }),
      ).not.toThrow();
    });
  });

  it("fails startup on a partially configured provider group", () => {
    expect(() =>
      validateStartupEnvironment({ BETTER_AUTH_SECRET: "test-only-admin-secret-at-least-32-characters" }),
    ).toThrow("BETTER_AUTH_URL");

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
      DATABASE_URL: "postgresql://localhost/niuva_dev",
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
