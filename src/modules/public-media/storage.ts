import { createHash } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getObjectStorageConfiguration } from "@/lib/env/object-storage";
import { validateStartupEnvironment } from "@/lib/env/server";
import { requireAllowed } from "@/modules/capabilities/resolver";
import { assertNonProductionProvider } from "@/modules/providers/non-production";
import { createS3ObjectStorageClient } from "@/modules/providers/s3";
import { appError } from "@/modules/shared/errors";
import { PUBLIC_MEDIA_MAX_BYTES } from "./schema";

export interface PublicMediaStorage {
  createUploadUrl(key: string, sizeBytes: number): Promise<string>;
  readQuarantine(key: string): Promise<Uint8Array>;
  deleteQuarantine(key: string): Promise<void>;
  publish(input: Readonly<{ key: string; bytes: Uint8Array; contentType: string }>): Promise<void>;
  readPublic(key: string): Promise<Uint8Array>;
}

export function createPublicMediaStorage(source: Readonly<Record<string, string | undefined>> = process.env): PublicMediaStorage {
  const env = validateStartupEnvironment(source);
  assertNonProductionProvider({ provider: "S3 object storage", nodeEnv: env.NODE_ENV });
  requireAllowed("objectStorage", { env: source });
  const storage = getObjectStorageConfiguration(env);
  if (!storage || storage.publicBucket === storage.privateBucket) throw appError("PROVIDER_UNAVAILABLE", { message: "Penyimpanan foto publik belum dikonfigurasi secara terpisah." });
  const client = createS3ObjectStorageClient(storage);
  const publicBucket = storage.publicBucket, quarantineBucket = storage.privateBucket;
  async function read(bucket: string, key: string): Promise<Uint8Array> {
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const body = response.Body;
    const close = () => { if (body && "destroy" in body && typeof body.destroy === "function") body.destroy(); };
    if (!body || !(Symbol.asyncIterator in body) || (response.ContentLength !== undefined && response.ContentLength > PUBLIC_MEDIA_MAX_BYTES)) {
      close(); throw appError("UPLOAD_REJECTED");
    }
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      for await (const chunk of body as AsyncIterable<Uint8Array>) {
        size += chunk.byteLength;
        if (size > PUBLIC_MEDIA_MAX_BYTES) throw appError("UPLOAD_REJECTED");
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } finally { close(); }
  }
  return {
    createUploadUrl: (key, sizeBytes) => getSignedUrl(client, new PutObjectCommand({ Bucket: quarantineBucket, Key: key, ContentType: "application/octet-stream", ContentLength: sizeBytes }), { expiresIn: 600, signableHeaders: new Set(["content-type", "content-length"]) }),
    readQuarantine: key => read(quarantineBucket, key),
    deleteQuarantine: async key => { await client.send(new DeleteObjectCommand({ Bucket: quarantineBucket, Key: key })); },
    readPublic: key => read(publicBucket, key),
    publish: async ({ key, bytes, contentType }) => { await client.send(new PutObjectCommand({ Bucket: publicBucket, Key: key, Body: bytes, ContentType: contentType, ContentMD5: createHash("md5").update(bytes).digest("base64"), CacheControl: "public, max-age=31536000, immutable", IfNoneMatch: "*" })); },
  };
}
