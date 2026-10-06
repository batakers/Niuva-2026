import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fetchInternalImage } from "next/dist/server/image-optimizer";
import { serveStatic } from "next/dist/server/serve-static";
import { expect, it } from "vitest";

it("finishes a shared static image fetch after its requesting client disconnects", async () => {
  const file = resolve("public/media/portfolio/cs-06-savero.png");
  const expected = await readFile(file);
  const socket = new Socket();
  socket.destroy();
  const request = new IncomingMessage(socket);
  request.method = "GET";
  const response = new ServerResponse(request);
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    // Real Next static-file serving uses on-finished to watch the socket.
    // Sharing a disconnected client's socket leaves this source fetch pending.
    const image = await Promise.race([
      fetchInternalImage("/media/portfolio/cs-06-savero.png", request, response,
        expected.length + 1, (req, res) => serveStatic(req, res, file)),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Shared image source did not finish after client disconnect")), 2000);
      }),
    ]);

    expect(image.contentType).toBe("image/png");
    expect(image.buffer).toEqual(expected);
    expect(image.etag).toBeTruthy();
  } finally {
    clearTimeout(timer);
    response.destroy();
    request.destroy();
  }
});
