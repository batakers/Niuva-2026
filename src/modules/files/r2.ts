import {
  DeleteObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { validateStartupEnvironment } from "@/lib/env/server";
import { CUSTOM_FILE_MAX_BYTES } from "@/modules/policy/privacy";
import { assertNonProductionProvider } from "@/modules/providers/non-production";
import { appError } from "@/modules/shared/errors";

export type ObjectStorageHead = Readonly<{
  contentLength?: number;
  contentType?: string;
}>;

export interface PrivateObjectStorage {
  createUploadUrl(input: Readonly<{
    contentType: string;
    expiresInSeconds: number;
    key: string;
  }>): Promise<string>;
  deleteObject(key: string): Promise<void>;
  headObject(key: string): Promise<ObjectStorageHead>;
}

export type R2PrivateStorageConfig = Readonly<{
  accessKeyId: string;
  endpoint: string;
  privateBucket: string;
  secretAccessKey: string;
}>;

export class R2PrivateObjectStorage implements PrivateObjectStorage {
  private readonly client: S3Client;

  constructor(private readonly config: R2PrivateStorageConfig) {
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

  async headObject(key: string): Promise<ObjectStorageHead> {
    const response = await this.client.send(
      new HeadObjectCommand({ Bucket: this.config.privateBucket, Key: key }),
    );

    return {
      contentLength: response.ContentLength,
      contentType: response.ContentType,
    };
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

  assertNonProductionProvider({
    nodeEnv: environment.NODE_ENV,
    provider: "R2",
  });

  return new R2PrivateObjectStorage({
    accessKeyId: environment.R2_ACCESS_KEY_ID,
    endpoint: environment.R2_ENDPOINT,
    privateBucket: environment.R2_PRIVATE_BUCKET,
    secretAccessKey: environment.R2_SECRET_ACCESS_KEY,
  });
}
