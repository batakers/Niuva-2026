import { createHash } from "node:crypto";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, type S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getObjectStorageConfiguration } from "@/lib/env/object-storage";
import { validateStartupEnvironment } from "@/lib/env/server";
import { requireAllowed, type CapabilityContext } from "@/modules/capabilities/resolver";
import { CUSTOM_FILE_MAX_BYTES } from "@/modules/policy/privacy";
import { assertNonProductionProvider } from "@/modules/providers/non-production";
import { createS3ObjectStorageClient } from "@/modules/providers/s3";
import { appError } from "@/modules/shared/errors";
import { CAD_INSPECTION_PREFIX_BYTES } from "./content-inspection";
import type { ObjectContentInspection, ObjectStorageHead, PrivateObjectStorage } from "./object-storage";
export type { PrivateObjectStorage } from "./object-storage";

export type S3PrivateStorageConfig = Readonly<{
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  endpoint: string;
  region: string;
  forcePathStyle?: boolean;
  privateBucket: string;
  publicBucket?: string;
  capabilityEnv?: Readonly<Record<string, string | undefined>>;
  gates?: CapabilityContext["gates"];
  hasActivationGrant?: CapabilityContext["hasActivationGrant"];
  nodeEnv?: "development" | "production" | "test";
  privateStorageBound?: boolean;
}>;

export function buildS3CapabilityContext(config: S3PrivateStorageConfig): CapabilityContext {
  const caller = config.capabilityEnv ?? {};
  const bound = config.privateStorageBound !== false;
  const present = (value: string) => value.trim() || undefined;
  const env = {
    DATABASE_URL: caller.DATABASE_URL ?? "postgresql://storage-scope.invalid/none",
    NIUVA_DEPLOYMENT_TIER: caller.NIUVA_DEPLOYMENT_TIER,
    NIUVA_PROVIDER_MODE: caller.NIUVA_PROVIDER_MODE,
    NODE_ENV: config.nodeEnv ?? caller.NODE_ENV,
    S3_ACCESS_KEY_ID: bound ? present(config.accessKeyId) : undefined,
    S3_SECRET_ACCESS_KEY: bound ? present(config.secretAccessKey) : undefined,
    S3_SESSION_TOKEN: bound ? config.sessionToken : undefined,
    S3_ENDPOINT: bound ? present(config.endpoint) : undefined,
    S3_REGION: bound ? present(config.region) : undefined,
    S3_FORCE_PATH_STYLE: bound ? String(config.forcePathStyle ?? true) : undefined,
    S3_PRIVATE_BUCKET: bound ? present(config.privateBucket) : undefined,
    // This adapter only touches the private resource. The public marker retains
    // the resolver's complete-group contract for explicitly injected adapters.
    S3_PUBLIC_BUCKET: bound ? (config.publicBucket ?? caller.S3_PUBLIC_BUCKET ?? "storage-scope-placeholder") : undefined,
  };
  return {
    env,
    ...(config.gates === undefined ? {} : { gates: config.gates }),
    ...(config.hasActivationGrant === undefined ? {} : { hasActivationGrant: config.hasActivationGrant }),
  };
}

export function assertS3PrivateStorageAllowed(config: S3PrivateStorageConfig): void {
  assertNonProductionProvider({
    provider: "S3 object storage",
    nodeEnv: config.nodeEnv === "production" || config.capabilityEnv?.NODE_ENV === "production" ? "production" : config.nodeEnv,
  });
  requireAllowed("objectStorage", buildS3CapabilityContext(config));
}

export class S3PrivateObjectStorage implements PrivateObjectStorage {
  private readonly client: S3Client;
  constructor(private readonly config: S3PrivateStorageConfig) {
    assertS3PrivateStorageAllowed(config);
    this.client = createS3ObjectStorageClient({ ...config, forcePathStyle: config.forcePathStyle ?? true });
  }

  async createUploadUrl(input: Readonly<{
    contentType: string;
    expiresInSeconds: number;
    key: string;
  }>): Promise<string> {
    if (
      !Number.isSafeInteger(input.expiresInSeconds) ||
      input.expiresInSeconds < 1 ||
      input.expiresInSeconds > 7 * 24 * 60 * 60
    ) {
      throw appError("VALIDATION_ERROR", {
        details: { expiresInSeconds: "Masa berlaku upload URL tidak valid." },
      });
    }

    return getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.config.privateBucket,
        ContentType: input.contentType,
        Key: input.key,
      }),
      { expiresIn: input.expiresInSeconds, signableHeaders: new Set(["content-type"]) },
    );
  }

  async createDownloadUrl(input: Readonly<{
    expiresInSeconds: number;
    key: string;
  }>): Promise<string> {
    if (
      !Number.isSafeInteger(input.expiresInSeconds) ||
      input.expiresInSeconds < 1 ||
      input.expiresInSeconds > 15 * 60
    ) {
      throw appError("VALIDATION_ERROR", {
        details: { expiresInSeconds: "Masa berlaku download URL tidak valid." },
      });
    }

    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.config.privateBucket,
        Key: input.key,
      }),
      { expiresIn: input.expiresInSeconds },
    );
  }

  async headObject(key: string): Promise<ObjectStorageHead> {
    const response = await this.client.send(
      new HeadObjectCommand({ Bucket: this.config.privateBucket, Key: key }),
    );

    return {
      contentLength: response.ContentLength,
      contentType: response.ContentType,
    };
  }

  async computeSha256(key: string, maxBytes: number): Promise<string> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.config.privateBucket, Key: key }),
    );
    const body = response.Body as AsyncIterable<Uint8Array> | undefined;

    if (body === undefined) {
      throw appError("PROVIDER_UNAVAILABLE");
    }

    const hash = createHash("sha256");
    let total = 0;

    for await (const chunk of body) {
      total += chunk.byteLength;

      if (total > maxBytes) {
        throw appError("UPLOAD_REJECTED", {
          details: { file: "Ukuran objek melebihi batas upload." },
        });
      }

      hash.update(chunk);
    }

    return hash.digest("hex");
  }

  async inspectObject(key: string, maxBytes: number): Promise<ObjectContentInspection> {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > CUSTOM_FILE_MAX_BYTES) throw appError("VALIDATION_ERROR");
    const response = await this.client.send(new GetObjectCommand({ Bucket: this.config.privateBucket, Key: key }));
    const body = response.Body;
    if (!body || !(Symbol.asyncIterator in body)) throw appError("PROVIDER_UNAVAILABLE");
    try {
      return await inspectObjectStream(body as AsyncIterable<Uint8Array>, maxBytes);
    } finally {
      if ("destroy" in body && typeof body.destroy === "function") body.destroy();
    }
  }

  async deleteObject(key: string, options?: Readonly<{ signal?: AbortSignal }>): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.privateBucket, Key: key }),
      { abortSignal: options?.signal },
    );
  }
}

export async function inspectObjectStream(body: AsyncIterable<Uint8Array>, maxBytes: number): Promise<ObjectContentInspection> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > CUSTOM_FILE_MAX_BYTES) throw appError("VALIDATION_ERROR");
  const prefix = new Uint8Array(Math.min(CAD_INSPECTION_PREFIX_BYTES, maxBytes));
  let prefixLength = 0;
  let sizeBytes = 0;
  const hash = createHash("sha256");
  for await (const chunk of body) {
    if (!(chunk instanceof Uint8Array)) throw appError("UPLOAD_REJECTED");
    sizeBytes += chunk.byteLength;
    if (sizeBytes > maxBytes) throw appError("UPLOAD_REJECTED");
    const take = Math.min(chunk.byteLength, prefix.length - prefixLength);
    prefix.set(chunk.subarray(0, take), prefixLength);
    prefixLength += take;
    hash.update(chunk);
  }
  if (sizeBytes === 0) throw appError("UPLOAD_REJECTED");
  return { prefix: prefix.subarray(0, prefixLength), sizeBytes, sha256: hash.digest("hex") };
}


export function createS3PrivateObjectStorageFromEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
): PrivateObjectStorage {
  const environment = validateStartupEnvironment(source);
  const storage = getObjectStorageConfiguration(environment);
  if (environment.CUSTOM_FILE_MAX_BYTES !== CUSTOM_FILE_MAX_BYTES || storage === undefined) {
    throw appError("PROVIDER_UNAVAILABLE", { message: "Private object storage belum dikonfigurasi." });
  }
  return new S3PrivateObjectStorage({
    ...storage,
    capabilityEnv: {
      DATABASE_URL: source.DATABASE_URL,
      NIUVA_DEPLOYMENT_TIER: source.NIUVA_DEPLOYMENT_TIER,
      NIUVA_PROVIDER_MODE: source.NIUVA_PROVIDER_MODE,
      NODE_ENV: source.NODE_ENV,
    },
    nodeEnv: environment.NODE_ENV,
  });
}
