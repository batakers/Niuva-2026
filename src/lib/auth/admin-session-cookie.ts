/**
 * Admin session cookie naming shared by the Better Auth engine and the proxy.
 * This module must not import the auth engine or the database client: hosts
 * such as Netlify bundle the proxy as an edge function, where `pg` cannot load.
 */
export const ADMIN_AUTH_COOKIE_PREFIX = "niuva_admin";

const SESSION_COOKIE = `${ADMIN_AUTH_COOKIE_PREFIX}.session_token`;
// Better Auth adds this prefix when it issues Secure cookies.
const SECURE_SESSION_COOKIE = `__Secure-${SESSION_COOKIE}`;

type CookieReader = Readonly<{ get: (name: string) => Readonly<{ value: string }> | undefined }>;

/**
 * Optimistic presence check only. It never proves a session: requireAdmin()
 * verifies the session, second factor and active profile on every Admin page,
 * API route and Server Action.
 */
export function hasAdminSessionCookie(cookies: CookieReader): boolean {
  return [SECURE_SESSION_COOKIE, SESSION_COOKIE].some((name) => (cookies.get(name)?.value.trim() ?? "") !== "");
}
