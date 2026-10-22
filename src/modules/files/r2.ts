import {
  assertS3PrivateStorageAllowed, buildS3CapabilityContext,
  createS3PrivateObjectStorageFromEnvironment, S3PrivateObjectStorage,
  type S3PrivateStorageConfig,
} from "./s3";

export type { ObjectStorageHead, ObjectContentInspection, PrivateObjectStorage } from "./object-storage";
export { inspectObjectStream } from "./s3";

/** Compatibility entry points for callers predating the S3 configuration contract. */
export type R2PrivateStorageConfig = Omit<S3PrivateStorageConfig, "region" | "forcePathStyle" | "sessionToken">;

function legacyConfig(config: R2PrivateStorageConfig): S3PrivateStorageConfig {
  return {
    ...config,
    region: "auto",
    forcePathStyle: true,
    publicBucket: config.publicBucket ?? config.capabilityEnv?.R2_PUBLIC_BUCKET,
  };
}

export const buildR2CapabilityContext = (config: R2PrivateStorageConfig) => buildS3CapabilityContext(legacyConfig(config));
export const assertR2PrivateStorageAllowed = (config: R2PrivateStorageConfig) => assertS3PrivateStorageAllowed(legacyConfig(config));
export class R2PrivateObjectStorage extends S3PrivateObjectStorage {
  constructor(config: R2PrivateStorageConfig) { super(legacyConfig(config)); }
}
export const createR2PrivateObjectStorageFromEnvironment = createS3PrivateObjectStorageFromEnvironment;
