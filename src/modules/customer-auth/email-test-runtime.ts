export function isCustomerEmailTestRuntime(source: Readonly<Record<string, string | undefined>> = process.env): boolean {
  if (source.NODE_ENV !== "test" || source.NIUVA_CUSTOMER_AUTH_MOCK !== "true") return false;
  try {
    const url = new URL(source.DATABASE_URL ?? "");
    return ["postgres:", "postgresql:"].includes(url.protocol) && ["localhost", "127.0.0.1"].includes(url.hostname) && /(^|[-_])test([-_]|$)/i.test(url.pathname.slice(1));
  } catch { return false; }
}
