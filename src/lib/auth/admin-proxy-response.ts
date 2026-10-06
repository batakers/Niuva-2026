import { NextResponse } from "next/server";

/**
 * Pure helpers for the admin proxy (`src/proxy.ts`). This module must not
 * import the auth engine so it stays testable and safe to use before any credentials
 * exist.
 */

export type AdminProxyRequestKind = "browser-navigation" | "api";

const QUALITY_VALUE_PATTERN = /^\d+(?:\.\d+)?$/;

/**
 * Returns true when one `Accept` range is `text/html` and its `q` weight is
 * absent or greater than 0. A malformed `q` is treated as not acceptable so an
 * unusual header never upgrades a request to the HTML response.
 */
function isAcceptableHtmlRange(range: string): boolean {
  const [rawType, ...parameters] = range.split(";");

  if (rawType?.trim().toLowerCase() !== "text/html") {
    return false;
  }

  for (const parameter of parameters) {
    const separatorIndex = parameter.indexOf("=");
    const name = (
      separatorIndex === -1 ? parameter : parameter.slice(0, separatorIndex)
    )
      .trim()
      .toLowerCase();

    if (name !== "q") {
      continue;
    }

    const value =
      separatorIndex === -1 ? "" : parameter.slice(separatorIndex + 1).trim();

    return QUALITY_VALUE_PATTERN.test(value) && Number(value) > 0;
  }

  return true;
}

/**
 * Decides whether a request without Admin auth configuration gets the HTML 503
 * (browser navigation) or the unchanged JSON 503 (everything else).
 *
 * `/api` and `/api/...` are always "api", whatever `Accept` says. Any other
 * path is a browser navigation only when `Accept` has a `text/html` range with
 * `q` absent or above 0. A missing header, a wildcard range,
 * `application/json`, and `text/x-component` therefore all stay "api".
 */
export function classifyAdminProxyRequest(
  input: Readonly<{ pathname: string; accept: string | null }>,
): AdminProxyRequestKind {
  const pathname = input.pathname.toLowerCase();

  if (pathname === "/api" || pathname.startsWith("/api/")) {
    return "api";
  }

  if (input.accept === null) {
    return "api";
  }

  return input.accept.split(",").some(isAcceptableHtmlRange)
    ? "browser-navigation"
    : "api";
}

/**
 * True only for the exact sign-in path or a path below `/admin/sign-in/`
 * (the native login and recovery UI). `/admin/sign-in-other`
 * and similar look-alikes are NOT matched and stay protected.
 *
 * Residual risk (design, Keputusan E): if a protected route is ever added
 * below `/admin/sign-in/`, it will be open at the proxy layer. `requireAdmin()`
 * in each resource remains the last line of defense.
 */
export function isAdminSignInPath(pathname: string): boolean {
  return pathname === "/admin/sign-in" || pathname.startsWith("/admin/sign-in/");
}

// Static document: no interpolation of request data, no external resources.
// The inline palette is copied from the DESIGN.md front matter because a proxy
// response cannot load the hashed Tailwind stylesheet. This is the one
// documented place where literal color values are allowed.
const ADMIN_AUTH_UNAVAILABLE_HTML = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Layanan autentikasi belum tersedia · Niuva Admin</title>
<style>
*,*::before,*::after{box-sizing:border-box}
body{margin:0;min-height:100vh;background:#F8FAFC;color:#0F172A;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:24px}
main{max-width:48rem;margin:0 auto;padding:4rem 1.25rem}
.eyebrow{margin:0 0 .75rem;color:#475569;font-size:14px;line-height:20px}
h1{margin:0 0 1rem;font-size:1.75rem;line-height:1.25}
p{margin:0 0 1.5rem;color:#475569}
a{color:#3F607F}
.action{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:10px 16px;border-radius:8px;background:#3F607F;color:#FFFFFF;font-weight:700;text-decoration:none}
.action:hover{background:#344F67}
.action:active{background:#2B4053}
.skip{position:absolute;left:-9999px;top:0;display:inline-flex;align-items:center;min-height:44px;padding:10px 16px;background:#FFFFFF;color:#0F172A;border:1px solid #E2E8F0;border-radius:8px}
.skip:focus{left:1rem;top:1rem}
a:focus-visible{outline:3px solid #6390BB;outline-offset:2px}
</style>
</head>
<body>
<a class="skip" href="#main-content">Lewati ke konten utama</a>
<main id="main-content">
<div class="eyebrow">Niuva / Admin</div>
<h1>Layanan autentikasi admin belum tersedia</h1>
<p>Ruang Admin belum dapat dibuka saat ini. Coba lagi nanti, atau kembali ke halaman publik.</p>
<a class="action" href="/">Kembali ke beranda</a>
</main>
</body>
</html>
`;

export function createAdminAuthUnavailableHtmlResponse(): NextResponse {
  return new NextResponse(ADMIN_AUTH_UNAVAILABLE_HTML, {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "Content-Language": "id",
    },
  });
}
