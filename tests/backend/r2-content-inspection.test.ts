import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { inspectObjectStream, R2PrivateObjectStorage } from "@/modules/files/r2";
import { CAD_INSPECTION_PREFIX_BYTES } from "@/modules/files/content-inspection";
import { CUSTOM_FILE_MAX_BYTES } from "@/modules/policy/privacy";

afterEach(() => vi.restoreAllMocks());
describe("R2 bounded content snapshot", () => {
  it("retains at most 64 KiB while hashing every byte from one GetObject", async () => {
    const content = Buffer.alloc(CAD_INSPECTION_PREFIX_BYTES + 73, 7);
    const stream = Readable.from([content.subarray(0, 19), content.subarray(19)]);
    const send = vi.spyOn(S3Client.prototype, "send").mockResolvedValue({ Body: stream } as never);
    const storage = new R2PrivateObjectStorage({ accessKeyId: "TEST-ONLY", secretAccessKey: "TEST-ONLY", endpoint: "https://r2.example.test", privateBucket: "private-test", nodeEnv: "test" });
    const result = await storage.inspectObject("private/test-key", CUSTOM_FILE_MAX_BYTES);
    expect(send).toHaveBeenCalledOnce(); expect(send.mock.calls[0][0]).toBeInstanceOf(GetObjectCommand);
    expect(result.prefix).toEqual(new Uint8Array(content.subarray(0, CAD_INSPECTION_PREFIX_BYTES)));
    expect(result.sizeBytes).toBe(content.length);
    expect(result.sha256).toBe(createHash("sha256").update(content).digest("hex"));
    expect(stream.destroyed).toBe(true);
  });
  it("allows the exact 100 MiB boundary without retaining the full body", async () => {
    const chunk = Buffer.alloc(64 * 1024, 1);
    async function* chunks() { for (let total = 0; total < CUSTOM_FILE_MAX_BYTES; total += chunk.length) yield chunk; }
    const result = await inspectObjectStream(chunks(), CUSTOM_FILE_MAX_BYTES);
    expect(result.sizeBytes).toBe(CUSTOM_FILE_MAX_BYTES); expect(result.prefix.length).toBe(CAD_INSPECTION_PREFIX_BYTES);
  });
  it("closes the iterator immediately on excess bytes", async () => {
    let closed = false; let read = 0;
    async function* chunks() { try { read++; yield Buffer.alloc(10); read++; yield Buffer.alloc(1); read++; yield Buffer.alloc(1); } finally { closed = true; } }
    await expect(inspectObjectStream(chunks(), 10)).rejects.toMatchObject({ code: "UPLOAD_REJECTED" });
    expect(read).toBe(2); expect(closed).toBe(true);
  });
  it("closes a failed provider stream and never returns a partial checksum", async () => {
    const stream = Readable.from((async function* () { yield Buffer.from("partial"); throw new Error("TEST-READ-FAILURE"); })());
    vi.spyOn(S3Client.prototype, "send").mockResolvedValue({ Body: stream } as never);
    const storage = new R2PrivateObjectStorage({ accessKeyId: "TEST-ONLY", secretAccessKey: "TEST-ONLY", endpoint: "https://r2.example.test", privateBucket: "private-test", nodeEnv: "test" });
    await expect(storage.inspectObject("private/test-key", CUSTOM_FILE_MAX_BYTES)).rejects.toThrow("TEST-READ-FAILURE");
    expect(stream.destroyed).toBe(true);
  });
  it.each([0, -1, 1.5, CUSTOM_FILE_MAX_BYTES + 1])("rejects invalid maximum %s before reading", async max => {
    const iterator = vi.fn();
    await expect(inspectObjectStream({ [Symbol.asyncIterator]: iterator }, max)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect(iterator).not.toHaveBeenCalled();
  });
  it("rejects empty objects", async () => {
    await expect(inspectObjectStream((async function* () {})(), 100)).rejects.toMatchObject({ code: "UPLOAD_REJECTED" });
  });
});
