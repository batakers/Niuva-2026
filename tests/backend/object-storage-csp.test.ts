import { describe, expect, it } from "vitest";

import {
  assertObjectStorageStartup,
  findMissingR2Variables,
} from "../../src/lib/env/object-storage-startup";
import type { FailureEvent } from "../../src/lib/observability/logger";
import { getContentSecurityPolicy } from "../../src/lib/security/headers";

const SECRET = "super-secret-value-123";

const complete = {
  CUSTOM_FILE_MAX_BYTES: "104857600",
  R2_ACCESS_KEY_ID: "access-id-value",
  R2_ACCOUNT_ID: "account-id-value",
  R2_ENDPOINT: "https://r2.example.test",
  R2_PRIVATE_BUCKET: "private-bucket",
  R2_PUBLIC_BUCKET: "public-bucket",
  R2_SECRET_ACCESS_KEY: SECRET,
};

function recorder() {
  const events: FailureEvent[] = [];
  return { events, logger: { record: (event: FailureEvent) => void events.push(event) } };
}

describe("R2 connect-src from the capability resolver", () => {
  it("adds the R2 origin when the configuration is complete", () => {
    expect(getContentSecurityPolicy("development", complete)).toContain(
      "connect-src 'self' https://r2.example.test ws: wss:",
    );
  });

  it("omits the origin and does not throw when R2 is absent", () => {
    const csp = getContentSecurityPolicy("development", {});
    expect(csp).toContain("connect-src 'self' ws: wss:");
    expect(() => assertObjectStorageStartup({}, recorder().logger)).not.toThrow();
  });

  it("does not read process.env implicitly", () => {
    const before = process.env.R2_ENDPOINT;
    process.env.R2_ENDPOINT = "https://leak.example.test";
    try {
      expect(getContentSecurityPolicy("development", {})).not.toContain("leak.example.test");
    } finally {
      if (before === undefined) delete process.env.R2_ENDPOINT;
      else process.env.R2_ENDPOINT = before;
    }
  });
});

describe("partial R2 configuration is rejected at start", () => {
  it("throws naming only missing variable names and logs without values", () => {
    const partial = { R2_ACCOUNT_ID: "account-id-value", R2_SECRET_ACCESS_KEY: SECRET };
    const { events, logger } = recorder();
    let message = "";

    try {
      assertObjectStorageStartup(partial, logger);
    } catch (error) {
      message = (error as Error).message;
    }

    expect(message).toContain("R2_ACCESS_KEY_ID");
    expect(message).toContain("R2_ENDPOINT");
    expect(message).not.toContain("R2_SECRET_ACCESS_KEY");
    expect(message).not.toContain(SECRET);
    expect(message).not.toContain("account-id-value");
    expect(events).toHaveLength(1);
    expect(JSON.stringify(events)).not.toContain(SECRET);
  });

  it("treats an upload limit without R2 as partial and passes a complete set", () => {
    expect(findMissingR2Variables({ CUSTOM_FILE_MAX_BYTES: "104857600" })).toHaveLength(6);
    expect(findMissingR2Variables(complete)).toEqual([]);
    expect(findMissingR2Variables({})).toEqual([]);
  });
});
