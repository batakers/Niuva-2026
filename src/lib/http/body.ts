import { appError } from "@/modules/shared/errors";

type ReadJsonBodyOptions = {
  maxBytes: number;
};

function getDeclaredBodySize(request: Request): number | undefined {
  const contentLength = request.headers.get("content-length");

  if (contentLength === null || !/^\d+$/.test(contentLength)) {
    return undefined;
  }

  const size = Number(contentLength);

  return Number.isSafeInteger(size) ? size : undefined;
}

async function readBoundedText(request: Request, maxBytes: number): Promise<string> {
  const declaredBodySize = getDeclaredBodySize(request);

  if (declaredBodySize !== undefined && declaredBodySize > maxBytes) {
    throw appError("REQUEST_TOO_LARGE");
  }

  if (request.body === null) {
    return "";
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      receivedBytes += value.byteLength;

      if (receivedBytes > maxBytes) {
        await reader.cancel();
        throw appError("REQUEST_TOO_LARGE");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(receivedBytes);
  let offset = 0;

  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(body);
  } catch {
    throw appError("INVALID_JSON");
  }
}

export async function readJsonBody(
  request: Request,
  { maxBytes }: ReadJsonBodyOptions,
): Promise<unknown> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) {
    throw new RangeError("maxBytes harus berupa integer positif.");
  }

  const rawBody = await readBoundedText(request, maxBytes);

  if (rawBody.trim().length === 0) {
    throw appError("INVALID_JSON");
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch {
    throw appError("INVALID_JSON");
  }
}
