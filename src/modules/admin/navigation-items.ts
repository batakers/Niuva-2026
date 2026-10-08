import type { AdminRole } from "@/generated/prisma/client";
import type { AdminAccess } from "@/lib/auth/admin";
import type { AdminRootPath } from "./navigation";
import { requireAdminPermission } from "./permissions";

export type AdminArea = "overview" | "queue" | "orders" | "custom-print" | "products" | "portfolio" | "inquiries" | "pricing" | "privacy" | "admins" | "search" | "activity" | "account" | "settings" | "customers" | "site-information" | "invoices" | "payments" | "expenses" | "reports" | "billing-settings";
export type AdminNavIcon = "overview" | "orders" | "custom-print" | "inquiries" | "products" | "portfolio" | "privacy" | "admins" | "settings" | "customers" | "site-information" | "invoices" | "payments" | "expenses" | "reports" | "pricing";
export type AdminNavItem = Readonly<{ area: AdminArea; label: string; href: AdminRootPath; icon: AdminNavIcon; children?: readonly AdminNavItem[] }>;
export type AdminNavGroup = Readonly<{ label: string; items: readonly AdminNavItem[] }>;

/** Only completed destinations are exposed; each route also authorizes access. */
export function getAdminNavigationForRole(role: AdminRole): readonly AdminNavGroup[] {
  return [
    { label: "Operasional", items: [
      { area: "overview", label: "Overview", href: "/admin", icon: "overview" },
      { area: "orders", label: "Orders", href: "/admin/orders", icon: "orders" },
      { area: "custom-print", label: "Custom Print", href: "/admin/custom-print", icon: "custom-print" },
      { area: "inquiries", label: "B2B Inquiries", href: "/admin/inquiries", icon: "inquiries" },
    ] },
    { label: "Kelola", items: [{ area: "products", label: "Products & Stock", href: "/admin/products", icon: "products" }, { area: "customers", label: "Customers", href: "/admin/customers", icon: "customers" }] },
    { label: "Keuangan", items: [{ area: "invoices", label: "Invoice", href: "/admin/finance/invoices", icon: "invoices" }, { area: "payments", label: "Pembayaran", href: "/admin/finance/payments", icon: "payments" }, { area: "expenses", label: "Pengeluaran", href: "/admin/finance/expenses", icon: "expenses" }] },
    { label: "Konten", items: [{ area: "portfolio", label: "Portfolio", href: "/admin/portfolio", icon: "portfolio" }, { area: "site-information", label: "Informasi Situs", href: "/admin/content/site-information", icon: "site-information" }] },
    { label: "Laporan", items: [{ area: "reports", label: "Laporan", href: "/admin/reports", icon: "reports" }] },
    ...(role === "OWNER" ? [{ label: "Owner", items: [
      { area: "settings", label: "Pengaturan", href: "/admin/settings", icon: "settings" },
      { area: "admins", label: "Admin & Akses", href: "/admin/admins", icon: "admins" },
      { area: "privacy", label: "Privasi Customer", href: "/admin/privacy", icon: "privacy" },
    ] satisfies readonly AdminNavItem[] }] : []),
  ];
}

export function getAdminNavigation(access: AdminAccess): readonly AdminNavGroup[] {
  requireAdminPermission(access, "AUDIT_READ");
  return getAdminNavigationForRole(access.profile.role);
}
