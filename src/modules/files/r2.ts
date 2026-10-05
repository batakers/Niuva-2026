import { createHash } from "node:crypto";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { validateStartupEnvironment } from "@/lib/env/server";
import {
  requireAllowed,
  type CapabilityContext,
} from "@/modules/capabilities/resolver";
import { CUSTOM_FILE_MAX_BYTES } from "@/modules/policy/privacy";
import { assertNonProductionProvider } from "@/modules/providers/non-production";
import { appError } from "@/modules/shared/errors";

export type ObjectStorageHead = Readonly<{
  contentLength?: number;
  contentType?: string;
}>;

export interface PrivateObjectStorage {
  createDownloadUrl(input: Readonly<{
    expiresInSeconds: number;
    key: string;
  }>): Promise<string>;
  createUploadUrl(input: Readonly<{
    contentType: string;
    expiresInSeconds: number;
    key: string;
  }>): Promise<string>;
  deleteObject(key: string): Promise<void>;
  headObject(key: string): Promise<ObjectStorageHead>;
  /**
   * Streams the object and returns its lower-case hex SHA-256. Implementations
   * must stop reading beyond `maxBytes`. Optional so lightweight adapters may
   * omit it; the upload service then leaves `sha256` null.
   */
  computeSha256?(key: string, maxBytes: number): Promise<string>;
}

export type R2PrivateStorageConfig = Readonly<{
  accessKeyId: string;
  /**
   * Caller-owned capability inputs (never read from process.env implicitly).
   * NODE_ENV, NIUVA_DEPLOYMENT_TIER, NIUVA_PROVIDER_MODE, DATABASE_URL,
   * R2_ACCOUNT_ID and R2_PUBLIC_BUCKET are taken from here when present.
   */
  capabilityEnv?: Readonly<Record<string, string | undefined>>;
  endpoint: string;
  gates?: CapabilityContext["gates"];
  hasActivationGrant?: CapabilityContext["hasActivationGrant"];
  nodeEnv?: "development" | "production" | "test";
  privateBucket: string;
  /** Set false to declare the private object storage resource unbound (default: bound). */
  privateStorageBound?: boolean;
  secretAccessKey: string;
}>;

const CALLER_CAPABILITY_KEYS = [
  "DATABASE_URL",
  "NIUVA_DEPLOYMENT_TIER",
  "NIUVA_PROVIDER_MODE",
  "NODE_ENV",
  "R2_ACCOUNT_ID",
  "R2_PUBLIC_BUCKET",
] as const;

function pickCapabilityEnv(
  source: Readonly<Record<string, string | undefined>>,
): Readonly<Record<string, string | undefined>> {
  return Object.fromEntries(
    CALLER_CAPABILITY_KEYS.map((key) => [key, source[key]]),
  );
}

// Non-secret markers for inputs this module does not use (it only touches the
// private bucket and never the database). They keep the resolver config group
// evaluable; a caller can still declare private storage unbound.
const SCOPE_PLACEHOLDER = "r2-scope-placeholder";
const SCOPE_DATABASE_URL = "postgresql://r2-scope.invalid/none";

/** Builds the resolver context from the caller-provided R2 configuration. */
export function buildR2CapabilityContext(
  config: R2PrivateStorageConfig,
): CapabilityContext {
  const caller = config.capabilityEnv ?? {};
  const present = (value: string): string | undefined =>
    value.trim().length > 0 ? value.trim() : undefined;
  const bound = config.privateStorageBound !== false;
  const env: Record<string, string | undefined> = {
    DATABASE_URL: caller.DATABASE_URL ?? SCOPE_DATABASE_URL,
    NIUVA_DEPLOYMENT_TIER: caller.NIUVA_DEPLOYMENT_TIER,
    NIUVA_PROVIDER_MODE: caller.NIUVA_PROVIDER_MODE,
    NODE_ENV: config.nodeEnv ?? caller.NODE_ENV,
    R2_ACCESS_KEY_ID: bound ? present(config.accessKeyId) : undefined,
    R2_ACCOUNT_ID: bound ? (caller.R2_ACCOUNT_ID ?? SCOPE_PLACEHOLDER) : undefined,
    R2_ENDPOINT: bound ? present(config.endpoint) : undefined,
    R2_PRIVATE_BUCKET: bound ? present(config.privateBucket) : undefined,
    R2_PUBLIC_BUCKET: bound ? (caller.R2_PUBLIC_BUCKET ?? SCOPE_PLACEHOLDER) : undefined,
    R2_SECRET_ACCESS_KEY: bound ? present(config.secretAccessKey) : undefined,
  };

  return {
    env,
    ...(config.gates === undefined ? {} : { gates: config.gates }),
    ...(config.hasActivationGrant === undefined
      ? {}
      : { hasActivationGrant: config.hasActivationGrant }),
  };
}

/** Legacy production rejection first (resolver can only tighten), then the resolver. */
export function assertR2PrivateStorageAllowed(
  config: R2PrivateStorageConfig,
): void {
  assertNonProductionProvider({
    nodeEnv:
      config.nodeEnv === "production" ||
      config.capabilityEnv?.NODE_ENV === "production"
        ? "production"
        : config.nodeEnv,
    provider: "R2",
  });
  requireAllowed("objectStorage", buildR2CapabilityContext(config));
}

export class R2PrivateObjectStorage implements PrivateObjectStorage {
  private readonly client: S3Client;

  constructor(private readonly config: R2PrivateStorageConfig) {
    assertR2PrivateStorageAllowed(config);
    this.client = new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
      region: "auto",
    });
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
      { expiresIn: input.expiresInSeconds },
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

  async deleteObject(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.config.privateBucket, Key: key }),
    );
  }
}

export function createR2PrivateObjectStorageFromEnvironment(
  source: Readonly<Record<string, string | undefined>> = process.env,
): PrivateObjectStorage {
  const environment = validateStartupEnvironment(source);

  if (
    environment.CUSTOM_FILE_MAX_BYTES !== CUSTOM_FILE_MAX_BYTES ||
    environment.R2_ACCESS_KEY_ID === undefined ||
    environment.R2_ENDPOINT === undefined ||
    environment.R2_PRIVATE_BUCKET === undefined ||
    environment.R2_SECRET_ACCESS_KEY === undefined
  ) {
    throw appError("PROVIDER_UNAVAILABLE", {
      message: "Private object storage belum dikonfigurasi.",
    });
  }

  return new R2PrivateObjectStorage({
    accessKeyId: environment.R2_ACCESS_KEY_ID,
    capabilityEnv: pickCapabilityEnv(source),
    endpoint: environment.R2_ENDPOINT,
    nodeEnv: environment.NODE_ENV,
    privateBucket: environment.R2_PRIVATE_BUCKET,
    secretAccessKey: environment.R2_SECRET_ACCESS_KEY,
  });
}
