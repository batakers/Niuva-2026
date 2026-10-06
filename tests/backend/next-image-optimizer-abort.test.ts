import { readFile } from "node:fs/promises";
import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { join } from "node:path";
import { Readable } from "node:stream";
import { fetchInternalImage } from "next/dist/server/image-optimizer";
import { serveStatic } from "next/dist/server/serve-static";
import { describe, expect, it } from "vitest";

const imagePath = join(process.cwd(), "public/media/portfolio/cs-01-smart-drop-box.png");

async function requireFinishedFetch<T>(fetch: Promise<T>): Promise<T> {
  let deadline: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      fetch,
      new Promise<never>((_, reject) => {
        deadline = setTimeout(() => reject(new Error("Internal image fetch remained pending after client abort")), 2_000);
      }),
    ]);
  } finally {
    if (deadline) clearTimeout(deadline);
  }
}

describe("Next internal public-image fetch after a client disconnect", () => {
  it("finishes the complete source after the original client aborts mid-stream", async () => {
    const expected = await readFile(imagePath);
    const client = new Socket();
    const request = new IncomingMessage(client);
    request.method = "GET";
    const response = new ServerResponse(request);
    let abortedDuringSourceRead = false;

    try {
      const fetch = fetchInternalImage(
        "/media/portfolio/cs-01-smart-drop-box.png",
        request,
        response,
        expected.byteLength,
        async (sourceRequest, sourceResponse) => {
          sourceResponse.once("pipe", (source: unknown) => {
            if (!(source instanceof Readable)) throw new Error("Expected a public-file read stream");
            source.once("data", () => {
              abortedDuringSourceRead = true;
              client.destroy();
            });
          });
          await serveStatic(sourceRequest, sourceResponse, imagePath);
        },
      );

      const image = await requireFinishedFetch(fetch);
      expect(abortedDuringSourceRead).toBe(true);
      expect(client.destroyed).toBe(true);
      expect(image.buffer.equals(expected)).toBe(true);
      expect(image.contentType).toBe("image/png");
    } finally {
      client.destroy();
    }
  });

  it("still fetches complete source bytes for a HEAD image request", async () => {
    const expected = await readFile(imagePath);
    const client = new Socket();
    const request = new IncomingMessage(client);
    request.method = "HEAD";
    const response = new ServerResponse(request);
    let sourceMethod: string | undefined;

    try {
      const image = await requireFinishedFetch(fetchInternalImage(
        "/media/portfolio/cs-01-smart-drop-box.png",
        request,
        response,
        expected.byteLength,
        async (sourceRequest, sourceResponse) => {
          sourceMethod = sourceRequest.method;
          await serveStatic(sourceRequest, sourceResponse, imagePath);
        },
      ));
      expect(sourceMethod).toBe("GET");
      expect(image.buffer.equals(expected)).toBe(true);
      expect(image.contentType).toBe("image/png");
    } finally {
      client.destroy();
    }
  });
});
