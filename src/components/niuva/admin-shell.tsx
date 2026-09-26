import type { ReactNode } from "react";
import Link from "next/link";
import type { AdminRole } from "@/generated/prisma/client";
import AuLogo from "@/components/ui/AuLogo";
import { AdminSessionActions } from "./admin-session-actions";

export type AdminArea =
  | "overview"
  | "queue"
  | "orders"
  | "custom-print"
  | "products"
  | "portfolio"
  | "inquiries"
  | "pricing";

const primaryNavigation: readonly Readonly<{ area: AdminArea; href: string; label: string }>[] = [
  { area: "overview", href: "/admin", label: "Overview" },
  { area: "queue", href: "/admin/queue", label: "Action Queue" },
  { area: "orders", href: "/admin/orders", label: "Orders" },
  { area: "custom-print", href: "/admin/custom-print", label: "Custom Print" },
  { area: "inquiries", href: "/admin/inquiries", label: "B2B Inquiries" },
];

const manageNavigation: readonly Readonly<{ area: AdminArea; href: string; label: string }>[] = [
  { area: "products", href: "/admin/products", label: "Products & Stock" },
  { area: "portfolio", href: "/admin/portfolio", label: "Portfolio" },
  { area: "pricing", href: "/admin/pricing", label: "Pricing Rules" },
];

const roleLabels: Record<AdminRole, string> = {
  ADMIN: "Admin",
  OWNER: "Owner",
};

export function AdminShell({
  active,
  children,
  role,
}: Readonly<{
  active: AdminArea;
  children: ReactNode;
  role: AdminRole;
}>) {
  const manageActive = manageNavigation.some((item) => item.area === active);
  return (
    <div
      className="min-h-dvh bg-neutral-100 text-foreground"
      data-foundation-propagation="approved"
      data-foundation-scope="admin"
      data-product-screen-proof-status="pending-owner-review"
      data-typography-propagation="approved"
      data-typography-version="1.0"
    >
      <div className="mx-auto max-w-admin px-4 pb-10 pt-4 sm:px-8 sm:pt-6">
        <header className="rounded-xl border border-border bg-card px-4 py-4 sm:px-6" aria-label="Niuva Admin">
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/admin" aria-label="Niuva Admin, kembali ke Overview" className="inline-flex rounded-lg bg-neutral-900 px-2 py-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <AuLogo className="h-6 w-auto" priority />
            </Link>
            <span className="text-sm font-medium text-muted-foreground">Operations</span>
            <span className="ml-auto rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground">{roleLabels[role]}</span>
            <Link className="hidden min-h-11 items-center text-sm font-medium text-brand-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:inline-flex" href="/">Situs publik</Link>
            <AdminSessionActions showLogout={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)} />
          </div>
          <nav aria-label="Menu operasional" className="mt-4 hidden flex-wrap items-center gap-2 lg:flex">
            {primaryNavigation.map((item) => <AdminNavLink active={active} item={item} key={item.area} />)}
            <details className="group relative">
              <summary className={`flex min-h-11 cursor-pointer list-none items-center rounded-full border px-4 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${manageActive ? "border-brand-700 bg-brand-50 text-brand-900" : "border-border bg-card"}`}>Kelola <span aria-hidden="true" className="ml-2 text-muted-foreground">⌄</span></summary>
              <div className="absolute right-0 z-20 mt-2 grid min-w-52 gap-1 rounded-xl border border-border bg-card p-1 shadow-floating">
                {manageNavigation.map((item) => <AdminNavLink active={active} item={item} key={item.area} menu />)}
              </div>
            </details>
          </nav>
          <details className="mt-4 lg:hidden">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center rounded-lg border border-border bg-card px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">Menu Admin <span aria-hidden="true" className="ml-2">⌄</span></summary>
            <nav aria-label="Menu operasional mobile" className="mt-3 grid gap-1 border-t border-border pt-3">
              {primaryNavigation.map((item) => <AdminNavLink active={active} item={item} key={item.area} menu />)}
              <p className="px-3 pt-2 text-xs font-semibold text-muted-foreground">Kelola</p>
              {manageNavigation.map((item) => <AdminNavLink active={active} item={item} key={item.area} menu />)}
              <Link className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm text-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 sm:hidden" href="/">Situs publik</Link>
            </nav>
          </details>
        </header>
        <div className="min-w-0 pt-6">{children}</div>
      </div>
    </div>
  );
}

function AdminNavLink({
  active,
  item,
  menu = false,
}: Readonly<{
  active: AdminArea;
  item: Readonly<{ area: AdminArea; href: string; label: string }>;
  menu?: boolean;
}>) {
  return (
    <Link
      aria-current={item.area === active ? "page" : undefined}
      className={`${menu ? "rounded-lg" : "rounded-full"} inline-flex min-h-11 items-center border px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${item.area === active ? "border-brand-700 bg-brand-50 text-brand-900" : "border-transparent text-foreground hover:border-border hover:bg-muted"}`}
      href={item.href}
    >
      {item.label}
    </Link>
  );
}

export function AdminDataUnavailableView({
  active = "overview",
  role,
  title = "Data operasional belum dapat dimuat",
}: Readonly<{ active?: AdminArea; role: AdminRole; title?: string }>) {
  const retryHref = active === "overview" ? "/admin" : active === "queue" ? "/admin/queue" :
    [...primaryNavigation, ...manageNavigation].find((item) => item.area === active)?.href ?? "/admin";
  return (
    <AdminShell active={active} role={role}><main className="rounded-xl border border-destructive-border bg-card p-6 sm:p-8" id="main-content">
      <p className="text-sm font-medium text-brand-700">Niuva / Admin</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
        Sesi {roleLabels[role]} tersedia, tetapi sumber data sedang tidak dapat dijangkau. Coba muat ulang tanpa mengubah data.
      </p>
      <p className="mt-5 text-sm font-medium text-destructive" role="alert">Tidak ada perubahan operasional yang dibuat.</p>
      <div className="mt-6">
        <AdminSessionActions retryHref={retryHref} showLogout={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)} />
      </div>
    </main></AdminShell>
  );
}

export function AdminPagination({
  basePath,
  hasNext,
  page,
}: Readonly<{
  basePath: string;
  hasNext: boolean;
  page: number;
}>) {
  if (page === 1 && !hasNext) return null;

  return (
    <nav aria-label="Paginasi data admin" className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
      <p className="text-sm text-muted-foreground">Halaman {page}</p>
      <div className="flex flex-wrap gap-2">
        {page > 1 ? (
          <Link className="inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:border-brand-400 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`${basePath}?page=${page - 1}`}>
            Sebelumnya
          </Link>
        ) : null}
        {hasNext ? (
          <Link className="inline-flex min-h-11 items-center rounded-lg border border-brand-300 bg-brand-50 px-4 text-sm font-semibold text-brand-900 hover:border-brand-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`${basePath}?page=${page + 1}`}>
            Berikutnya
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
