import { createHash } from "node:crypto";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createS3PrivateObjectStorageFromEnvironment } from "@/modules/files/s3";
import { createPublicMediaStorage } from "@/modules/public-media/storage";

const objects = new Map<string, { bytes: Buffer; contentType: string }>();
const requests: { method: string; url: URL; bucket: string }[] = [];
let rejectDeletes = false;
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://fixture.invalid");
  const key = decodeURIComponent(url.pathname), bucket = key.split("/")[1];
  requests.push({ method: request.method ?? "", url, bucket });
  if (request.method === "PUT") {
    if (request.headers["if-none-match"] === "*" && objects.has(key)) {
      response.writeHead(412).end("<Error><Code>PreconditionFailed</Code></Error>"); return;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const bytes = Buffer.concat(chunks);
    if (!url.searchParams.has("X-Amz-Signature") && request.headers["content-md5"] !== createHash("md5").update(bytes).digest("base64")) {
      response.writeHead(400).end("<Error><Code>BadDigest</Code></Error>"); return;
    }
    objects.set(key, { bytes, contentType: request.headers["content-type"] ?? "application/octet-stream" });
    response.writeHead(200).end(); return;
  }
  if (request.method === "DELETE") {
    if (rejectDeletes) { response.writeHead(403).end("<Error><Code>AccessDenied</Code></Error>"); return; }
    objects.delete(key); response.writeHead(204).end(); return;
  }
  const object = objects.get(key);
  if (!object) { response.writeHead(404).end("<Error><Code>NoSuchKey</Code></Error>"); return; }
  response.writeHead(200, { "content-type": object.contentType, "content-length": object.bytes.length });
  response.end(request.method === "HEAD" ? undefined : object.bytes);
});

let environment: Record<string, string>;
beforeAll(async () => {
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  environment = {
    NODE_ENV: "test", NIUVA_DEPLOYMENT_TIER: "local-test", NIUVA_PROVIDER_MODE: "sandbox",
    S3_ENDPOINT: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    S3_REGION: "fixture-region-1", S3_ACCESS_KEY_ID: "TEST-ONLY", S3_SECRET_ACCESS_KEY: "TEST-ONLY",
    S3_PRIVATE_BUCKET: "fixture-private", S3_PUBLIC_BUCKET: "fixture-public",
    S3_FORCE_PATH_STYLE: "true", CUSTOM_FILE_MAX_BYTES: "104857600",
  };
});
beforeEach(() => { objects.clear(); requests.length = 0; rejectDeletes = false; });
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
});

describe("S3 adapters against an isolated loopback HTTP fixture", () => {
  it("roundtrips a private file with real SDK signing, HEAD, bounded inspection, download and idempotent deletion", async () => {
    const storage = createS3PrivateObjectStorageFromEnvironment(environment);
    const key = "private/customer/fixture.stl", bytes = Buffer.from("solid fixture\nendsolid fixture\n");
    const uploadUrl = await storage.createUploadUrl({ key, contentType: "model/stl", expiresInSeconds: 600 });
    expect((await fetch(uploadUrl, { method: "PUT", headers: { "content-type": "model/stl" }, body: bytes })).ok).toBe(true);
    expect(requests[0].url.searchParams.get("X-Amz-Signature")).toMatch(/^[a-f0-9]{64}$/);
    expect(requests[0].url.searchParams.get("X-Amz-Credential")).toContain("/fixture-region-1/s3/aws4_request");
    expect(await storage.headObject(key)).toEqual({ contentLength: bytes.length, contentType: "model/stl" });
    expect(await storage.inspectObject(key, bytes.length)).toEqual({ prefix: new Uint8Array(bytes), sizeBytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
    await expect(storage.inspectObject(key, bytes.length - 1)).rejects.toMatchObject({ code: "UPLOAD_REJECTED" });
    const downloadUrl = await storage.createDownloadUrl({ key, expiresInSeconds: 60 });
    expect(Buffer.from(await (await fetch(downloadUrl)).arrayBuffer())).toEqual(bytes);
    await storage.deleteObject(key);
    await storage.deleteObject(key);
    await expect(storage.headObject(key)).rejects.toMatchObject({ $metadata: { httpStatusCode: 404 } });
    expect(requests.every(request => request.bucket === "fixture-private")).toBe(true);
  });

  it("keeps Admin quarantine and published media in separate buckets and prevents overwrite", async () => {
    const storage = createPublicMediaStorage(environment), bytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const quarantine = "admin-media-quarantine/fixture", publicKey = "media/products/fixture.png";
    const uploadUrl = await storage.createUploadUrl(quarantine, bytes.length);
    const signed = new URL(uploadUrl);
    expect(signed.searchParams.get("X-Amz-SignedHeaders")).toContain("content-length");
    expect(signed.searchParams.get("X-Amz-SignedHeaders")).toContain("content-type");
    expect(signed.searchParams.get("X-Amz-Expires")).toBe("600");
    expect((await fetch(uploadUrl, { method: "PUT", headers: { "content-type": "application/octet-stream" }, body: bytes })).ok).toBe(true);
    expect(await storage.readQuarantine(quarantine)).toEqual(bytes);
    await storage.publish({ key: publicKey, bytes, contentType: "image/png" });
    expect(await storage.readPublic(publicKey)).toEqual(bytes);
    await expect(storage.publish({ key: publicKey, bytes, contentType: "image/png" })).rejects.toMatchObject({ $metadata: { httpStatusCode: 412 } });
    await storage.deleteQuarantine(quarantine);
    expect(objects.has(`/fixture-private/${quarantine}`)).toBe(false);
    expect(objects.has(`/fixture-private/${publicKey}`)).toBe(false);
    expect(objects.has(`/fixture-public/${publicKey}`)).toBe(true);
  });

  it("does not send a retention delete after its abort signal has fired", async () => {
    const key = "private/customer/aborted.stl";
    objects.set(`/fixture-private/${key}`, { bytes: Buffer.from("retain"), contentType: "model/stl" });
    const controller = new AbortController();
    controller.abort();

    await expect(createS3PrivateObjectStorageFromEnvironment(environment).deleteObject(key, { signal: controller.signal }))
      .rejects.toMatchObject({ name: "AbortError" });

    expect(objects.has(`/fixture-private/${key}`)).toBe(true);
    expect(requests.filter(request => request.method === "DELETE")).toHaveLength(0);
  });

  it("propagates unconfirmed deletion failures for the lifecycle caller to retry", async () => {
    const key = "private/customer/retain.stl";
    objects.set(`/fixture-private/${key}`, { bytes: Buffer.from("retain"), contentType: "model/stl" });
    rejectDeletes = true;
    await expect(createS3PrivateObjectStorageFromEnvironment(environment).deleteObject(key)).rejects.toMatchObject({ $metadata: { httpStatusCode: 403 } });
    expect(objects.has(`/fixture-private/${key}`)).toBe(true);
  });
});
