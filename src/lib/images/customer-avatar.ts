// Classifies the stored Google avatar URL for the /account page.
//
// Stored URLs are validated only by host (any *.googleusercontent.com, see
// customer-auth/core.ts), so they can be wider than the optimizer's
// `images.remotePatterns` entry in next.config.ts (https, one subdomain label,
// no port, path /a/**, no query). Rather than widening that pattern:
//   - "optimized": URL matches the pattern exactly, so next/image may proxy it.
//   - "unoptimized": https Google host allowed by CSP img-src, but outside the
//     pattern; render without the optimizer so the server never fetches it.
//   - "none": anything else; the caller shows the initial-letter avatar.

export type CustomerAvatarSource = Readonly<
  | { mode: "optimized"; src: string }
  | { mode: "unoptimized"; src: string }
  | { mode: "none" }
>;

const GOOGLE_AVATAR_SUFFIX = ".googleusercontent.com";

export function resolveCustomerAvatar(
  avatarUrl: string | null | undefined,
): CustomerAvatarSource {
  if (!avatarUrl) return { mode: "none" };

  let url: URL;
  try {
    url = new URL(avatarUrl);
  } catch {
    return { mode: "none" };
  }

  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    !hostname.endsWith(GOOGLE_AVATAR_SUFFIX) ||
    hostname.length === GOOGLE_AVATAR_SUFFIX.length
  ) {
    return { mode: "none" };
  }

  const subdomain = hostname.slice(0, -GOOGLE_AVATAR_SUFFIX.length);
  const matchesPattern =
    !subdomain.includes(".") &&
    url.port === "" &&
    url.search === "" &&
    url.pathname.startsWith("/a/") &&
    url.pathname.length > "/a/".length;

  return matchesPattern
    ? { mode: "optimized", src: url.href }
    : { mode: "unoptimized", src: url.href };
}
