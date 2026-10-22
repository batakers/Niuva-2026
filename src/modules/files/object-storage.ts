export type ObjectStorageHead = Readonly<{
  contentLength?: number;
  contentType?: string;
}>;

export type ObjectContentInspection = Readonly<{
  prefix: Uint8Array;
  sha256: string;
  sizeBytes: number;
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
  deleteObject(key: string, options?: Readonly<{ signal?: AbortSignal }>): Promise<void>;
  headObject(key: string): Promise<ObjectStorageHead>;
  /** One bounded stream snapshot for CAD format, actual size, and checksum. */
  inspectObject(key: string, maxBytes: number): Promise<ObjectContentInspection>;
  /**
   * Streams the object and returns its lower-case hex SHA-256. Implementations
   * must stop reading beyond `maxBytes`. Optional so lightweight adapters may
   * omit it; the upload service then leaves `sha256` null.
   */
  computeSha256?(key: string, maxBytes: number): Promise<string>;
}
