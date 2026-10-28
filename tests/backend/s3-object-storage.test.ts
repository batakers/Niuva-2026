import { afterEach, describe, expect, it, vi } from "vitest";

import { assertObjectStorageStartup } from "@/lib/env/object-storage-startup";
import { getObjectStorageConfiguration } from "@/lib/env/object-storage";
import { getServerCapabilities, validateStartupEnvironment } from "@/lib/env/server";
import { getObjectStorageConnectOrigin } from "@/lib/security/headers";
import { decide } from "@/modules/capabilities/resolver";
import { createS3PrivateObjectStorageFromEnvironment } from "@/modules/files/s3";
import { createPublicMediaStorage } from "@/modules/public-media/storage";

const storageEnv = {
  NODE_ENV: "test",
  NIUVA_DEPLOYMENT_TIER: "local-test",
  NIUVA_PROVIDER_MODE: "sandbox",
  DATABASE_URL: "postgresql://fixture@localhost/niuva_test",
  CUSTOM_FILE_MAX_BYTES: "104857600",
  S3_ENDPOINT: "https://objects.example.test:9443",
  S3_REGION: "test-region-1",
  S3_ACCESS_KEY_ID: "TEST-ONLY-ACCESS",
  S3_SECRET_ACCESS_KEY: "TEST-ONLY-SECRET",
  S3_PRIVATE_BUCKET: "niuva-private",
  S3_PUBLIC_BUCKET: "niuva-public",
} as const;

afterEach(() => vi.unstubAllEnvs());

describe("provider-neutral object storage configuration", () => {
  it("enables storage and uploads without a Cloudflare account", () => {
    const environment = validateStartupEnvironment(storageEnv);
    expect(getServerCapabilities(storageEnv)).toMatchObject({ objectStorage: true, customUploads: true });
    expect(getObjectStorageConfiguration(environment)).toMatchObject({
      endpoint: storageEnv.S3_ENDPOINT, region: storageEnv.S3_REGION,
      privateBucket: storageEnv.S3_PRIVATE_BUCKET, publicBucket: storageEnv.S3_PUBLIC_BUCKET,
      forcePathStyle: true,
    });
    expect(() => assertObjectStorageStartup(storageEnv)).not.toThrow();
  });

  it.each(["S3_ENDPOINT", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY", "S3_PRIVATE_BUCKET", "S3_PUBLIC_BUCKET"])("rejects missing %s without leaking credentials", field => {
    let message = "";
    try { validateStartupEnvironment({ ...storageEnv, [field]: " " }); } catch (error) { message = (error as Error).message; }
    expect(message).toContain(field);
    expect(message).not.toContain(storageEnv.S3_ACCESS_KEY_ID);
    expect(message).not.toContain(storageEnv.S3_SECRET_ACCESS_KEY);
    expect(decide("objectStorage", { env: { ...storageEnv, [field]: "" } }).allowed).toBe(false);
  });

  it("logs a partial S3 configuration using safe metadata only", () => {
    const record = vi.fn();
    expect(() => assertObjectStorageStartup({ S3_SECRET_ACCESS_KEY: storageEnv.S3_SECRET_ACCESS_KEY }, { record })).toThrow("S3_ENDPOINT");
    expect(record).toHaveBeenCalledOnce();
    expect(JSON.stringify(record.mock.calls)).not.toContain(storageEnv.S3_SECRET_ACCESS_KEY);
  });

  it("leaves unrelated environment validation to the main startup validator", () => {
    const source = { ...storageEnv, APP_URL: "invalid-url" }, record = vi.fn();
    expect(() => assertObjectStorageStartup(source, { record })).not.toThrow();
    expect(record).not.toHaveBeenCalled();
    expect(() => validateStartupEnvironment(source)).toThrow("APP_URL");
  });

  it("rejects mixed namespaces rather than combining credentials", () => {
    expect(() => validateStartupEnvironment({ ...storageEnv, R2_ACCOUNT_ID: "legacy-account" })).toThrow();
    expect(getObjectStorageConnectOrigin("test", { ...storageEnv, R2_ENDPOINT: "https://legacy.example.test" })).toBeUndefined();
  });

  it.each([
    { S3_FORCE_PATH_STYLE: "yes" },
    { S3_ENDPOINT: "https://user:password@objects.example.test" },
    { S3_ENDPOINT: "https://objects.example.test/path" },
    { S3_ENDPOINT: "https://objects.example.test?key=secret" },
    { S3_ENDPOINT: "http://objects.example.test" },
    { S3_PUBLIC_BUCKET: storageEnv.S3_PRIVATE_BUCKET },
    { S3_PRIVATE_BUCKET: "arn:aws:s3:::other-account" },
  ])("rejects invalid or unsafe S3 configuration %#", override => {
    expect(() => validateStartupEnvironment({ ...storageEnv, ...override })).toThrow();
    expect(getObjectStorageConnectOrigin("test", { ...storageEnv, ...override })).toBeUndefined();
  });

  it("does not inherit credentials or provider mode from the process", () => {
    vi.stubEnv("NIUVA_PROVIDER_MODE", "live");
    vi.stubEnv("S3_SESSION_TOKEN", "UNRELATED-PROCESS-TOKEN");
    expect(() => createS3PrivateObjectStorageFromEnvironment(storageEnv)).not.toThrow();
    expect(getObjectStorageConfiguration(validateStartupEnvironment(storageEnv))?.sessionToken).toBeUndefined();
  });

  it.each([
    { NODE_ENV: "production", NIUVA_DEPLOYMENT_TIER: "local-test" },
    { NIUVA_DEPLOYMENT_TIER: "production" },
    { NIUVA_PROVIDER_MODE: "live" },
  ])("preserves production and live gates %#", override => {
    const source = { ...storageEnv, ...override };
    expect(() => createS3PrivateObjectStorageFromEnvironment(source)).toThrow();
    expect(() => createPublicMediaStorage(source)).toThrow();
    expect(getObjectStorageConnectOrigin(source.NODE_ENV, source)).toBeUndefined();
  });

  it("opens staging sandbox only through the recorded E6 objectStorage grant", () => {
    const source = { ...storageEnv, NIUVA_DEPLOYMENT_TIER: "staging" };
    expect(() => createS3PrivateObjectStorageFromEnvironment(source)).not.toThrow();
    expect(() => createPublicMediaStorage(source)).not.toThrow();
    expect(getObjectStorageConnectOrigin(source.NODE_ENV, source)).toBeDefined();
  });

  it("still requires the approved upload limit for private storage", () => {
    expect(() => createS3PrivateObjectStorageFromEnvironment({ ...storageEnv, CUSTOM_FILE_MAX_BYTES: "" })).toThrow();
    expect(getServerCapabilities({ ...storageEnv, CUSTOM_FILE_MAX_BYTES: "" })).toMatchObject({ objectStorage: true, customUploads: false });
  });
});

describe("S3 signing and browser CSP use the same addressing", () => {
  it.each([
    { S3_FORCE_PATH_STYLE: "true", S3_PRIVATE_BUCKET: "niuva-private" },
    { S3_FORCE_PATH_STYLE: "false", S3_PRIVATE_BUCKET: "niuva-private" },
    { S3_FORCE_PATH_STYLE: "false", S3_PRIVATE_BUCKET: "niuva.private" },
    { S3_FORCE_PATH_STYLE: "false", S3_PRIVATE_BUCKET: "niuva-private", S3_ENDPOINT: "https://127.0.0.1:9443" },
  ])("allows the exact signed upload origin, with no wildcard %#", async override => {
    const source = { ...storageEnv, ...override, S3_SESSION_TOKEN: "TEST-ONLY-SESSION" };
    const storage = createS3PrivateObjectStorageFromEnvironment(source);
    const upload = new URL(await storage.createUploadUrl({ key: "private/customer/file.stl", contentType: "model/stl", expiresInSeconds: 600 }));
    expect(getObjectStorageConnectOrigin("test", source)).toBe(upload.origin);
    expect(upload.searchParams.get("X-Amz-Credential")).toContain("/test-region-1/s3/aws4_request");
    expect(upload.searchParams.get("X-Amz-Security-Token")).toBe("TEST-ONLY-SESSION");
    expect(upload.searchParams.get("X-Amz-Expires")).toBe("600");
    expect(upload.searchParams.get("X-Amz-SignedHeaders")).toContain("content-type");
    expect(upload.searchParams.has("x-amz-checksum-crc32")).toBe(false);
    const download = new URL(await storage.createDownloadUrl({ key: "private/customer/file.stl", expiresInSeconds: 900 }));
    expect(download.origin).toBe(upload.origin);
    await expect(storage.createDownloadUrl({ key: "private/customer/file.stl", expiresInSeconds: 901 })).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("allows HTTP only for an isolated loopback fixture and never relaxes browser CSP", async () => {
    const source = { ...storageEnv, S3_ENDPOINT: "http://127.0.0.1:9000" };
    expect(() => createS3PrivateObjectStorageFromEnvironment(source)).not.toThrow();
    expect(getObjectStorageConnectOrigin("test", source)).toBeUndefined();
  });
});
