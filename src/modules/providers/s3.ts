import { S3Client } from "@aws-sdk/client-s3";
import type { ObjectStorageConfiguration } from "@/lib/env/object-storage";

export function createS3ObjectStorageClient(config: Pick<ObjectStorageConfiguration,
  "endpoint" | "region" | "forcePathStyle" | "accessKeyId" | "secretAccessKey" | "sessionToken"
>): S3Client {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      ...(config.sessionToken === undefined ? {} : { sessionToken: config.sessionToken }),
    },
    // Browser PUTs have an unknown body when signed; an SDK checksum of an empty
    // body would reject the real file. Niuva verifies size/content/SHA-256 on confirm.
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
}
