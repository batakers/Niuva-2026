import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { validateStartupEnvironment } from "@/lib/env/server";
import { requireAllowed } from "@/modules/capabilities/resolver";
import { assertNonProductionProvider } from "@/modules/providers/non-production";
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
  assertNonProductionProvider({ provider: "R2", nodeEnv: env.NODE_ENV });
  requireAllowed("objectStorage", { env: source });
  if (!env.R2_PUBLIC_BUCKET || !env.R2_PRIVATE_BUCKET || env.R2_PUBLIC_BUCKET === env.R2_PRIVATE_BUCKET || !env.R2_ENDPOINT || !env.R2_ACCESS_KEY_ID || !env.R2_SECRET_ACCESS_KEY) throw appError("PROVIDER_UNAVAILABLE", { message: "Penyimpanan foto publik belum dikonfigurasi secara terpisah." });
  const client = new S3Client({ endpoint: env.R2_ENDPOINT, region: "auto", credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY } });
  const publicBucket = env.R2_PUBLIC_BUCKET, quarantineBucket = env.R2_PRIVATE_BUCKET;
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
    createUploadUrl: (key, sizeBytes) => getSignedUrl(client, new PutObjectCommand({ Bucket: quarantineBucket, Key: key, ContentType: "application/octet-stream", ContentLength: sizeBytes }), { expiresIn: 600 }),
    readQuarantine: key => read(quarantineBucket, key),
    deleteQuarantine: async key => { await client.send(new DeleteObjectCommand({ Bucket: quarantineBucket, Key: key })); },
    readPublic: key => read(publicBucket, key),
    publish: async ({ key, bytes, contentType }) => { await client.send(new PutObjectCommand({ Bucket: publicBucket, Key: key, Body: bytes, ContentType: contentType, CacheControl: "public, max-age=31536000, immutable", IfNoneMatch: "*" })); },
  };
}
