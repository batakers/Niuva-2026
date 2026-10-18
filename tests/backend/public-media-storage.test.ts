import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ send: vi.fn(), sign: vi.fn() }));
vi.mock("@aws-sdk/client-s3", async importOriginal => {
  const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
  return { ...actual, S3Client: class { send = mocks.send; } };
});
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: mocks.sign }));
import { createPublicMediaStorage } from "@/modules/public-media/storage";
import { matchesPublicImage } from "@/modules/public-media/schema";

const env = {
  NODE_ENV: "test", NIUVA_DEPLOYMENT_TIER: "local-test", NIUVA_PROVIDER_MODE: "sandbox",
  R2_ENDPOINT: "https://r2.example.test", R2_ACCOUNT_ID: "fixture", R2_ACCESS_KEY_ID: "fixture", R2_SECRET_ACCESS_KEY: "fixture",
  R2_PRIVATE_BUCKET: "fixture-private", R2_PUBLIC_BUCKET: "fixture-public", CUSTOM_FILE_MAX_BYTES: "104857600",
};
beforeEach(() => { mocks.send.mockReset().mockResolvedValue({}); mocks.sign.mockReset().mockResolvedValue("https://upload.example.test/fixture"); });
describe("public media storage boundaries", () => {
  it("signs only a quarantine object and writes a verified snapshot to the separate public bucket", async () => {
    const storage = createPublicMediaStorage(env);
    await storage.createUploadUrl("admin-media-quarantine/fixture", 1234);
    expect(mocks.sign.mock.calls[0][1].input).toMatchObject({ Bucket: "fixture-private", Key: "admin-media-quarantine/fixture", ContentType: "application/octet-stream", ContentLength: 1234 });
    await storage.publish({ key: "media/products/fixture.png", bytes: new Uint8Array([1,2,3]), contentType: "image/png" });
    expect(mocks.send.mock.calls[0][0].input).toMatchObject({ Bucket: "fixture-public", ContentType: "image/png", IfNoneMatch: "*" });
  });
  it.each([{ ...env, R2_PUBLIC_BUCKET: env.R2_PRIVATE_BUCKET }, { ...env, NODE_ENV: "production", NIUVA_DEPLOYMENT_TIER: "production" }, { ...env, NIUVA_PROVIDER_MODE: "live" }, { ...env, NIUVA_DEPLOYMENT_TIER: "staging" }])("keeps wrong buckets, production, live and ungranted staging closed %#", source => {
    expect(() => createPublicMediaStorage(source)).toThrow();
    expect(mocks.send).not.toHaveBeenCalled(); expect(mocks.sign).not.toHaveBeenCalled();
  });
  it("does not accept SVG/HTML by their claimed image extension", () => {
    const html = new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>");
    for (const mime of ["image/jpeg", "image/png", "image/webp"]) expect(matchesPublicImage(html, mime)).toBe(false);
  });
  it("deletes rejected uploads from the private quarantine bucket", async () => {
    const storage = createPublicMediaStorage(env);
    await storage.deleteQuarantine("admin-media-quarantine/rejected");
    expect(mocks.send.mock.calls[0][0].input).toMatchObject({ Bucket: "fixture-private", Key: "admin-media-quarantine/rejected" });
  });
});
