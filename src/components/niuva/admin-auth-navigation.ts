/** A new document discards the previous account's client router cache after a session change. */
export function navigateAfterAdminAuth(target: "/" | "/admin" | "/admin/sign-in" | "/admin/sign-in?flow=password-updated") {
  window.location.replace(target);
}
