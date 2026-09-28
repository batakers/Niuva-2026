import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3, BriefcaseBusiness, ExternalLink, Images, LayoutDashboard,
  ListTodo, Menu, Package, Printer, ShoppingBag, SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import type { AdminRole } from "@/generated/prisma/client";
import NiuvaLogo from "@/components/ui/NiuvaLogo";
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

type NavigationItem = Readonly<{ area: AdminArea; href: string; label: string; icon: LucideIcon }>;

const primaryNavigation: readonly NavigationItem[] = [
  { area: "overview", href: "/admin", label: "Overview", icon: LayoutDashboard },
  { area: "queue", href: "/admin/queue", label: "Action Queue", icon: ListTodo },
  { area: "orders", href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { area: "custom-print", href: "/admin/custom-print", label: "Custom Print", icon: Printer },
  { area: "inquiries", href: "/admin/inquiries", label: "B2B Inquiries", icon: BriefcaseBusiness },
];

const manageNavigation: readonly NavigationItem[] = [
  { area: "products", href: "/admin/products", label: "Products & Stock", icon: Package },
  { area: "portfolio", href: "/admin/portfolio", label: "Portfolio", icon: Images },
  { area: "pricing", href: "/admin/pricing", label: "Pricing Rules", icon: SlidersHorizontal },
];

const roleLabels: Record<AdminRole, string> = {
  ADMIN: "Admin",
  OWNER: "Owner",
};

export function AdminShell({
  active,
  children,
  productScreenProofStatus = "pending-owner-review",
  role,
}: Readonly<{
  active: AdminArea;
  children: ReactNode;
  productScreenProofStatus?: "approved-owner" | "pending-owner-review";
  role: AdminRole;
}>) {
  const currentArea = [...primaryNavigation, ...manageNavigation].find((item) => item.area === active);
  return (
    <div
      className="min-h-dvh bg-neutral-100 text-foreground"
      data-foundation-propagation="approved"
      data-foundation-scope="admin"
      data-product-screen-proof-status={productScreenProofStatus}
      data-typography-propagation="approved"
      data-typography-version="1.0"
    >
      <Link className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3 focus:text-brand-900 focus:shadow-floating" href="#main-content">Lewati ke konten utama</Link>
      <div className="mx-auto grid min-h-dvh max-w-admin lg:grid-cols-[13.25rem_minmax(0,1fr)]">
        <aside className="hidden border-r border-sidebar-border bg-card lg:block" aria-label="Navigasi Admin">
          <div className="sticky top-0 flex h-dvh flex-col overflow-y-auto px-3 py-6">
            <Link href="/admin" aria-label="Niuva Admin, kembali ke Overview" className="mb-9 inline-flex w-fit rounded-lg bg-neutral-900 px-2 py-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
              <NiuvaLogo className="h-6 w-auto" priority />
            </Link>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Operasional</p>
            <nav aria-label="Operasional" className="mt-2 grid gap-1">
              {primaryNavigation.map((item) => <AdminNavLink active={active} item={item} key={item.area} />)}
            </nav>
            <p className="mt-8 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Kelola</p>
            <nav aria-label="Kelola" className="mt-2 grid gap-1">
              {manageNavigation.map((item) => <AdminNavLink active={active} item={item} key={item.area} />)}
            </nav>
            <Link className="mt-auto inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-brand-700 hover:bg-brand-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/">
              <ExternalLink aria-hidden="true" className="size-4" /> Situs publik
            </Link>
          </div>
        </aside>
        <div className="min-w-0">
          <header className="border-b border-border bg-card px-4 py-3 sm:px-6 lg:px-8" aria-label="Niuva Admin">
            <div className="flex min-h-11 flex-wrap items-center gap-3">
              <Link href="/admin" aria-label="Niuva Admin, kembali ke Overview" className="inline-flex rounded-lg bg-neutral-900 px-2 py-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:hidden">
                <NiuvaLogo className="h-6 w-auto" priority />
              </Link>
              <BarChart3 aria-hidden="true" className="hidden size-4 text-brand-700 lg:block" />
              <span className="min-w-0 text-sm font-semibold text-foreground">Admin <span className="text-muted-foreground">/ {currentArea?.label ?? "Overview"}</span></span>
              <span className="ml-auto rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground">{roleLabels[role]}</span>
              <AdminSessionActions showLogout={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)} />
            </div>
            <details className="mt-3 lg:hidden">
              <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg border border-border bg-card px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
                <Menu aria-hidden="true" className="size-4" /> Menu Admin
              </summary>
              <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
                <nav aria-label="Operasional mobile" className="grid gap-1">
                  <p className="px-3 text-xs font-semibold text-muted-foreground">Operasional</p>
                  {primaryNavigation.map((item) => <AdminNavLink active={active} item={item} key={item.area} />)}
                </nav>
                <nav aria-label="Kelola mobile" className="grid gap-1">
                  <p className="px-3 text-xs font-semibold text-muted-foreground">Kelola</p>
                  {manageNavigation.map((item) => <AdminNavLink active={active} item={item} key={item.area} />)}
                  <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/"><ExternalLink aria-hidden="true" className="size-4" />Situs publik</Link>
                </nav>
              </div>
            </details>
          </header>
          <div className="min-w-0 px-4 pb-10 pt-6 sm:px-6 lg:px-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

function AdminNavLink({
  active,
  item,
}: Readonly<{
  active: AdminArea;
  item: NavigationItem;
}>) {
  const Icon = item.icon;
  return (
    <Link
      aria-current={item.area === active ? "page" : undefined}
      className={`inline-flex min-h-11 min-w-0 items-center gap-3 rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${item.area === active ? "border-brand-300 bg-brand-50 text-brand-900" : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground"}`}
      href={item.href}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
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
