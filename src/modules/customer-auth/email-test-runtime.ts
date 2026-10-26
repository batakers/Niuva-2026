export function isCustomerEmailTestRuntime(source: Readonly<Record<string, string | undefined>> = process.env): boolean {
  if (source.NODE_ENV !== "test" || source.NIUVA_CUSTOMER_AUTH_MOCK !== "true") return false;
  try {
    const url = new URL(source.DATABASE_URL ?? "");
    return ["postgres:", "postgresql:"].includes(url.protocol) && ["localhost", "127.0.0.1"].includes(url.hostname) && /(^|[-_])test([-_]|$)/i.test(url.pathname.slice(1));
  } catch { return false; }
}

export function isCustomerPublicAuthTestRuntime(source: Readonly<Record<string, string | undefined>> = process.env): boolean {
  if (!isCustomerEmailTestRuntime(source) || source.NIUVA_CUSTOMER_PUBLIC_AUTH_TEST !== "true"
    || source.NIUVA_INTERNAL_AUTH_ENABLED === "true"
    || source.NIUVA_DEPLOYMENT_TIER && source.NIUVA_DEPLOYMENT_TIER !== "local-test"
    || source.NIUVA_PROVIDER_MODE && source.NIUVA_PROVIDER_MODE !== "mock") return false;
  try {
    const app = new URL(source.APP_URL ?? "");
    const db = new URL(source.DATABASE_URL ?? "");
    return ["127.0.0.1", "localhost", "[::1]"].includes(app.hostname)
      && ["http:", "https:"].includes(app.protocol) && !app.username && !app.password
      && app.pathname === "/" && !app.search && !app.hash
      && !db.hash && [...db.searchParams].every(([key, value]) => key === "schema" && value === "public");
  } catch { return false; }
}
