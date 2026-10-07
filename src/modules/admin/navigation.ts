/** Root navigation context only: record links never become nested return targets. */
export const adminRootPaths = ["/admin", "/admin/queue", "/admin/orders", "/admin/custom-print", "/admin/inquiries", "/admin/products", "/admin/portfolio", "/admin/pricing", "/admin/privacy"] as const;
export type AdminRootPath = typeof adminRootPaths[number];

const rootLabels: Readonly<Record<AdminRootPath, string>> = {
  "/admin": "Overview",
  "/admin/queue": "Action Queue",
  "/admin/orders": "Orders",
  "/admin/custom-print": "Custom Print",
  "/admin/inquiries": "B2B Inquiries",
  "/admin/products": "Products & Stock",
  "/admin/portfolio": "Portfolio",
  "/admin/pricing": "Pricing Rules",
  "/admin/privacy": "Privasi Customer",
};

export function adminRootLabel(href: string): string | undefined {
  const path = href.split(/[?#]/, 1)[0];
  return isAdminRootPath(path) ? rootLabels[path] : undefined;
}

const statuses: Readonly<Record<string, readonly string[]>> = {
  "/admin/inquiries": ["NEW", "CONTACTED", "QUALIFIED", "QUOTED", "WON", "LOST", "CLOSED"],
  "/admin/custom-print": ["SUBMITTED", "UNDER_REVIEW", "QUOTE_READY", "QUOTE_SENT", "APPROVED", "DECLINED", "CANCELLED"],
  "/admin/orders": ["PENDING_PAYMENT", "PAID", "PROCESSING", "READY_TO_SHIP", "SHIPPED", "COMPLETED", "CANCELLED", "SUBMITTED", "UNDER_REVIEW", "WAITING_FOR_APPROVAL", "WAITING_PAYMENT", "IN_PRODUCTION", "FINISHING_QC", "WAITING_SHIPPING_PAYMENT"],
  "/admin/privacy": ["OPEN", "IN_REVIEW", "RESOLVED"],
};

export function isAdminRootPath(value: string): value is AdminRootPath {
  return adminRootPaths.some(path => path === value);
}

export function normalizeAdminReturnTo(value: unknown, fallback: AdminRootPath): string {
  if (typeof value !== "string" || /[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  const path = value.split(/[?#]/, 1)[0];
  if (!isAdminRootPath(path)) return fallback;
  const url = new URL(value, "https://admin.niuva.invalid");
  const query = new URLSearchParams();
  for (const [key, entry] of url.searchParams) {
    if (query.has(key) || /[\u0000-\u001f\u007f]/.test(entry)) continue;
    if (key === "page" && path !== "/admin" && path !== "/admin/queue" && /^[1-9]\d{0,5}$/.test(entry) && Number(entry) <= 100_000) query.set(key, entry);
    if (key === "q" && ["/admin/inquiries", "/admin/custom-print", "/admin/orders", "/admin/products", "/admin/portfolio"].includes(path) && entry.trim().length > 0 && entry.trim().length <= 100) query.set(key, entry.trim());
    if (key === "status" && statuses[path]?.includes(entry)) query.set(key, entry);
    if (key === "type" && path === "/admin/orders" && ["RETAIL", "CUSTOM_PRINT"].includes(entry)) query.set(key, entry);
    if (key === "publication" && ["/admin/products", "/admin/portfolio"].includes(path) && ["published", "draft"].includes(entry)) query.set(key, entry);
    if (key === "group" && ["/admin", "/admin/queue"].includes(path) && ["all", "inquiries", "custom-print", "orders"].includes(entry)) query.set(key, entry);
    if (key === "range" && ["/admin", "/admin/queue"].includes(path) && ["30d", "13m"].includes(entry)) query.set(key, entry);
  }
  const suffix = query.toString();
  return suffix ? `${path}?${suffix}` : path;
}

export function withAdminReturnTo(destination: string, returnTo: string): string {
  const url = new URL(destination, "https://admin.niuva.invalid");
  if (url.origin !== "https://admin.niuva.invalid" || !url.pathname.startsWith("/admin/")) throw new Error("Admin destination must be internal.");
  url.searchParams.set("returnTo", normalizeAdminReturnTo(returnTo, "/admin"));
  return `${url.pathname}?${url.searchParams.toString()}`;
}

export function buildAdminPageHref(basePath: AdminRootPath, query: Readonly<Record<string, string>>, page: number): string {
  const params = new URLSearchParams(query);
  params.set("page", String(Math.min(100_000, Math.max(1, Math.trunc(page) || 1))));
  return normalizeAdminReturnTo(`${basePath}?${params}`, basePath);
}
