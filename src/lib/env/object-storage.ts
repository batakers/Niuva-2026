export const S3_REQUIRED_VARIABLES = [
  "S3_ENDPOINT", "S3_REGION", "S3_ACCESS_KEY_ID", "S3_SECRET_ACCESS_KEY",
  "S3_PRIVATE_BUCKET", "S3_PUBLIC_BUCKET",
] as const;

export const R2_ENVIRONMENT_VARIABLES = [
  "R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY",
  "R2_PRIVATE_BUCKET", "R2_PUBLIC_BUCKET", "R2_ENDPOINT",
] as const;

export const S3_ENVIRONMENT_VARIABLES = [
  ...S3_REQUIRED_VARIABLES, "S3_FORCE_PATH_STYLE", "S3_SESSION_TOKEN",
] as const;

type ObjectStorageEnvironment = Readonly<
  Partial<Record<typeof S3_REQUIRED_VARIABLES[number] | typeof R2_ENVIRONMENT_VARIABLES[number] | "S3_SESSION_TOKEN", string>> & {
    S3_FORCE_PATH_STYLE?: boolean;
    CUSTOM_FILE_MAX_BYTES?: number;
  }
>;

export type ObjectStorageConfiguration = Readonly<{
  endpoint: string;
  region: string;
  forcePathStyle: boolean;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  privateBucket: string;
  publicBucket: string;
}>;

export class ObjectStorageConfigurationError extends Error {
  constructor(readonly fields: readonly string[]) {
    super(`Konfigurasi object storage tidak valid: ${fields.join(", ")}.`);
    this.name = "ObjectStorageConfigurationError";
  }
}

function isSafeS3Endpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return (url.protocol === "https:" ||
      (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))) &&
      !url.username && !url.password && !url.search && !url.hash && url.pathname === "/";
  } catch { return false; }
}

function isBucketName(value: string): boolean {
  return /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(value) &&
    !value.includes("..") && !value.includes(".-") && !value.includes("-.") &&
    !/^\d+\.\d+\.\d+\.\d+$/.test(value);
}

/** Exactly one complete namespace; credentials and resource names never cross groups. */
export function getObjectStorageConfiguration(environment: ObjectStorageEnvironment): ObjectStorageConfiguration | undefined {
  const s3 = S3_ENVIRONMENT_VARIABLES.filter(field => environment[field] !== undefined);
  const r2 = R2_ENVIRONMENT_VARIABLES.filter(field => environment[field] !== undefined);
  if (s3.length > 0 && r2.length > 0) throw new ObjectStorageConfigurationError([...s3, ...r2]);

  if (s3.length > 0) {
    const missing = S3_REQUIRED_VARIABLES.filter(field => environment[field] === undefined);
    const { S3_ENDPOINT: endpoint, S3_REGION: region, S3_ACCESS_KEY_ID: accessKeyId,
      S3_SECRET_ACCESS_KEY: secretAccessKey, S3_PRIVATE_BUCKET: privateBucket,
      S3_PUBLIC_BUCKET: publicBucket, S3_SESSION_TOKEN: sessionToken } = environment;
    if (!endpoint || !region || !accessKeyId || !secretAccessKey || !privateBucket || !publicBucket) {
      throw new ObjectStorageConfigurationError(missing);
    }
    const invalid: string[] = [];
    if (!isSafeS3Endpoint(endpoint)) invalid.push("S3_ENDPOINT");
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*$/.test(region)) invalid.push("S3_REGION");
    if (!isBucketName(privateBucket)) invalid.push("S3_PRIVATE_BUCKET");
    if (!isBucketName(publicBucket) || publicBucket === privateBucket) invalid.push("S3_PUBLIC_BUCKET");
    if (invalid.length > 0) throw new ObjectStorageConfigurationError(invalid);
    return { endpoint, region, accessKeyId, secretAccessKey, privateBucket, publicBucket,
      forcePathStyle: environment.S3_FORCE_PATH_STYLE ?? true,
      ...(sessionToken === undefined ? {} : { sessionToken }) };
  }

  if (r2.length > 0) {
    const missing = R2_ENVIRONMENT_VARIABLES.filter(field => environment[field] === undefined);
    const { R2_ENDPOINT: endpoint, R2_ACCESS_KEY_ID: accessKeyId, R2_SECRET_ACCESS_KEY: secretAccessKey,
      R2_PRIVATE_BUCKET: privateBucket, R2_PUBLIC_BUCKET: publicBucket } = environment;
    if (missing.length > 0 || !endpoint || !accessKeyId || !secretAccessKey || !privateBucket || !publicBucket) {
      throw new ObjectStorageConfigurationError(missing);
    }
    // Path style keeps browser PUTs on the configured origin during the R2 transition.
    return { endpoint, region: "auto", forcePathStyle: true, accessKeyId, secretAccessKey, privateBucket, publicBucket };
  }

  if (environment.CUSTOM_FILE_MAX_BYTES !== undefined) {
    throw new ObjectStorageConfigurationError([...S3_REQUIRED_VARIABLES, ...R2_ENVIRONMENT_VARIABLES]);
  }
  return undefined;
}

/** Mirrors S3's virtual-host eligibility; dotted TLS buckets and IP endpoints use paths. */
export function getObjectStorageUploadOrigin(config: ObjectStorageConfiguration): string {
  const url = new URL(config.endpoint);
  const ipEndpoint = /^\d+\.\d+\.\d+\.\d+$/.test(url.hostname) || url.hostname.startsWith("[");
  if (!config.forcePathStyle && !ipEndpoint && !config.privateBucket.includes(".")) {
    url.hostname = `${config.privateBucket}.${url.hostname}`;
  }
  return url.origin;
}
