import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BriefcaseBusiness, ExternalLink, Images, LayoutDashboard,
  ListTodo, Menu, Package, Printer, ShoppingBag, SlidersHorizontal, ShieldCheck, UserRoundPlus,
  type LucideIcon,
} from "lucide-react";
import type { AdminRole } from "@/generated/prisma/client";
import { AdminSessionActions } from "./admin-session-actions";
import type { FailureKind } from "@/lib/observability/logger";
import { AdminSidebarLayout, AdminSidebarLink, AdminSidebarToggle } from "./admin-sidebar";
import { adminDataUnavailableDescription } from "./system-state-copy";

export type AdminArea =
  | "overview"
  | "queue"
  | "orders"
  | "custom-print"
  | "products"
  | "portfolio"
  | "inquiries"
  | "pricing"
  | "privacy"
  | "admins";
// Owner privacy operations share the existing shell, with separate permission.

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
  { area: "privacy", href: "/admin/privacy", label: "Privasi Customer", icon: ShieldCheck },
  { area: "admins", href: "/admin/admins/new", label: "Tambah Admin", icon: UserRoundPlus },
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
      <AdminSidebarLayout>
        <aside id="admin-desktop-sidebar" className="hidden border-r border-sidebar-border bg-card lg:block" aria-label="Navigasi Admin">
          <div className="sticky top-0 flex h-dvh flex-col px-3 py-6 group-data-[sidebar-collapsed=true]/admin-shell:px-2">
            <Link href="/admin" aria-label="Niuva Admin, kembali ke Overview" className="mb-9 inline-flex min-h-11 w-fit shrink-0 items-center rounded-lg px-2 py-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 group-data-[sidebar-collapsed=true]/admin-shell:w-full group-data-[sidebar-collapsed=true]/admin-shell:justify-center group-data-[sidebar-collapsed=true]/admin-shell:px-0">
              <AdminLogo className="h-6 w-auto group-data-[sidebar-collapsed=true]/admin-shell:hidden" />
              <Image alt="Niuva simbol biru" className="hidden h-6 w-auto group-data-[sidebar-collapsed=true]/admin-shell:block" height={1098} priority src="/assets/brand/niuva-symbol-blue.svg" width={1093} />
            </Link>
            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 group-data-[sidebar-collapsed=true]/admin-shell:[scrollbar-width:none] group-data-[sidebar-collapsed=true]/admin-shell:[&::-webkit-scrollbar]:hidden">
              <p className="px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground group-data-[sidebar-collapsed=true]/admin-shell:sr-only">Operasional</p>
              <nav aria-label="Operasional" className="mt-2 grid gap-1">
                {primaryNavigation.map((item) => <AdminDesktopNavLink active={active} item={item} key={item.area} />)}
              </nav>
              <p className="mt-8 px-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground group-data-[sidebar-collapsed=true]/admin-shell:sr-only">Kelola</p>
              <nav aria-label="Kelola" className="mt-2 grid gap-1 group-data-[sidebar-collapsed=true]/admin-shell:mt-8">
                {manageNavigation.filter(item => !["privacy", "admins"].includes(item.area) || role === "OWNER").map((item) => <AdminDesktopNavLink active={active} item={item} key={item.area} />)}
              </nav>
            </div>
            <div className="mt-4 flex shrink-0 justify-center border-t border-border pt-4">
              <AdminSidebarToggle />
            </div>
          </div>
        </aside>
        <div className="min-w-0">
          <header className="border-b border-border bg-card px-4 py-3 sm:px-6 lg:px-8" aria-label="Niuva Admin">
            <div className="flex min-h-11 flex-wrap items-center gap-3">
              <Link href="/admin" aria-label="Niuva Admin, kembali ke Overview" className="inline-flex min-h-11 items-center rounded-lg px-2 py-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:hidden">
                <AdminLogo className="h-6 w-auto" />
              </Link>
              <span className="min-w-0 text-sm font-semibold text-foreground">Admin <span className="text-muted-foreground">/ {currentArea?.label ?? "Overview"}</span></span>
              <div className="ml-auto flex shrink-0 items-center gap-3">
                <Link className="hidden min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:inline-flex" href="/"><ExternalLink aria-hidden="true" className="size-4 shrink-0" />Situs publik</Link>
                <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground">{roleLabels[role]}</span>
                <AdminSessionActions showLogout={Boolean(process.env.BETTER_AUTH_URL)} />
              </div>
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
                  {manageNavigation.filter(item => !["privacy", "admins"].includes(item.area) || role === "OWNER").map((item) => <AdminNavLink active={active} item={item} key={item.area} />)}
                  <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm text-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/"><ExternalLink aria-hidden="true" className="size-4" />Situs publik</Link>
                </nav>
              </div>
            </details>
          </header>
          <div className="min-w-0 px-4 pb-10 pt-6 sm:px-6 lg:px-8">{children}</div>
        </div>
      </AdminSidebarLayout>
    </div>
  );
}

function AdminLogo({ className }: Readonly<{ className: string }>) {
  return <Image alt="Niuva logo" className={className} height={346} priority src="/assets/brand/niuva-logo-horizontal-light.svg" width={1831} />;
}

function AdminDesktopNavLink({ active, item }: Readonly<{ active: AdminArea; item: NavigationItem }>) {
  const Icon = item.icon;
  return (
    <AdminSidebarLink active={item.area === active} href={item.href} label={item.label}>
      <Icon aria-hidden="true" className="size-4 shrink-0" />
    </AdminSidebarLink>
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
  kind,
  role,
  title = "Data operasional belum dapat dimuat",
}: Readonly<{ active?: AdminArea; kind?: FailureKind; role: AdminRole; title?: string }>) {
  const retryHref = active === "overview" ? "/admin" : active === "queue" ? "/admin/queue" :
    [...primaryNavigation, ...manageNavigation].find((item) => item.area === active)?.href ?? "/admin";
  return (
    <AdminShell active={active} role={role}><main className="rounded-xl border border-destructive-border bg-card p-6 sm:p-8" id="main-content">
      <p className="text-sm font-medium text-brand-700">Niuva / Admin</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
        {kind === undefined
          ? `Sesi ${roleLabels[role]} tersedia, tetapi sumber data sedang tidak dapat dijangkau. Coba muat ulang tanpa mengubah data.`
          : adminDataUnavailableDescription(kind)}
      </p>
      <p className="mt-5 text-sm font-medium text-destructive" role="alert">Tidak ada perubahan operasional yang dibuat.</p>
      <div className="mt-6">
        <AdminSessionActions retryHref={retryHref} showLogout={Boolean(process.env.BETTER_AUTH_URL)} />
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
