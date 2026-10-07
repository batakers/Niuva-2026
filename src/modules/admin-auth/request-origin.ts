/** Next may expose an internal listener URL. Auth must use the configured public origin. */
export function withAdminAuthOrigin(request: Request, baseUrl: string | undefined): Request {
  if (!baseUrl) throw new Error("Admin auth origin is unavailable.");
  const origin = new URL(baseUrl);
  if (!["http:", "https:"].includes(origin.protocol) || origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("Admin auth origin is invalid.");
  }
  const url = new URL(request.url);
  url.protocol = origin.protocol;
  url.host = origin.host;
  url.port = origin.port;
  url.username = "";
  url.password = "";
  // Preserve the browser Origin header: the boundary still rejects foreign origins.
  return new Request(url.toString(), {
    method: request.method,
    headers: request.headers,
    signal: request.signal,
    ...(request.body ? { body: request.body, duplex: "half" } : {}),
  });
}
