import { buttonVariants } from "@/components/ui/button";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  BriefcaseBusiness, ExternalLink, Images, LayoutDashboard,
  Package, Printer, ShoppingBag, SlidersHorizontal, ShieldCheck, UsersRound, Settings, ContactRound, Globe, ReceiptText, CreditCard, Wallet, ChartNoAxesCombined,
  type LucideIcon,
} from "lucide-react";
import type { AdminRole } from "@/generated/prisma/client";
import { AdminSessionActions } from "./admin-session-actions";
import { AdminAccountMenu } from "./admin-account-menu";
import { AdminGlobalSearch } from "./admin-global-search";
import { AdminNotificationCenter } from "./admin-notification-center";
import type { FailureKind } from "@/lib/observability/logger";
import { AdminSidebarLayout, AdminSidebarLink, AdminSidebarToggle, AdminMobileNavigation } from "./admin-sidebar";
import { Button } from "@/components/ui/button";
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { adminDataUnavailableDescription } from "./system-state-copy";
import { buildAdminPageHref, isAdminRootPath } from "@/modules/admin/navigation";
import { getAdminNavigationForRole, type AdminNavItem, type AdminNavIcon, type AdminArea } from "@/modules/admin/navigation-items";
export type { AdminArea } from "@/modules/admin/navigation-items";

type NavigationItem = AdminNavItem;
const navigationIcons: Record<AdminNavIcon, LucideIcon> = { overview: LayoutDashboard, orders: ShoppingBag, "custom-print": Printer, inquiries: BriefcaseBusiness, products: Package, portfolio: Images, privacy: ShieldCheck, admins: UsersRound, settings: Settings, customers: ContactRound, "site-information": Globe, invoices: ReceiptText, payments: CreditCard, expenses: Wallet, reports: ChartNoAxesCombined, pricing: SlidersHorizontal };

const roleLabels: Record<AdminRole, string> = {
  ADMIN: "Admin",
  OWNER: "Owner",
};

export function AdminShell({
  active, children, productScreenProofStatus = "pending-owner-review", role,
}: Readonly<{
  active: AdminArea;
  children: ReactNode;
  productScreenProofStatus?: "approved-owner" | "pending-owner-review";
  role: AdminRole;
}>) {
  const navigation = getAdminNavigationForRole(role);
  const currentArea = navigation.flatMap(group => group.items).find(item => item.area === active);
  const currentLabel = currentArea?.label ?? ({ search: "Pencarian", activity: "Aktivitas", account: "Akun saya" } as const)[active as "search" | "activity" | "account"] ?? "Overview";
  return (
    <div className="min-h-dvh bg-background text-foreground" data-foundation-propagation="approved" data-foundation-scope="admin" data-product-screen-proof-status={productScreenProofStatus} data-typography-propagation="approved" data-typography-version="1.0">
      <Link className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:p-3 focus:text-brand-900 focus:shadow-floating" href="#main-content">Lewati ke konten utama</Link>
      <AdminSidebarLayout>
        <Sidebar id="admin-desktop-sidebar" aria-label="Navigasi Admin" className="bg-card">
          <SidebarHeader className="border-b border-sidebar-border py-5">
            <Link href="/admin" aria-label="Niuva Admin, kembali ke Overview" className="inline-flex min-h-11 items-center rounded-lg px-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:px-0">
              <AdminLogo className="h-6 w-auto group-data-[collapsible=icon]/sidebar:hidden" />
              <Image alt="Niuva simbol biru" className="hidden h-6 w-auto group-data-[collapsible=icon]/sidebar:block" height={1098} priority src="/assets/brand/niuva-symbol-blue.svg" width={1093} />
            </Link>
          </SidebarHeader>
          <SidebarContent className="pt-3">
            {navigation.map(group => <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarGroupContent>
                <nav aria-label={group.label}>
                  <SidebarMenu>{group.items.map(item => <SidebarMenuItem key={item.area}><AdminDesktopNavLink active={active} item={item} /></SidebarMenuItem>)}</SidebarMenu>
                </nav>
              </SidebarGroupContent>
            </SidebarGroup>)}
          </SidebarContent>
          <SidebarFooter className="items-center"><AdminSidebarToggle /></SidebarFooter>
        </Sidebar>
        <SidebarInset>
          <header className="sticky top-0 z-30 border-b border-border bg-card px-4 py-3 sm:px-6 lg:px-8" aria-label="Niuva Admin">
            <div className="flex min-h-11 flex-wrap items-center gap-3">
              <Link href="/admin" aria-label="Niuva Admin, kembali ke Overview" className="inline-flex min-h-11 items-center rounded-lg py-2 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:hidden"><AdminLogo className="h-5 w-auto" /></Link>
              <div className="hidden items-center gap-3 lg:flex"><span className="text-sm font-medium">{currentLabel}</span><Separator orientation="vertical" className="h-5" /></div>
              <div className="order-3 w-full min-w-0 lg:order-none lg:flex-1"><AdminGlobalSearch /></div>
              <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
                <Button nativeButton={false} role="link" render={<Link href="/" />} variant="ghost" className="hidden text-muted-foreground lg:inline-flex"><ExternalLink aria-hidden className="size-4" />Situs publik</Button>
                <AdminNotificationCenter />
                <AdminAccountMenu role={role} />
              </div>
            </div>
            <div className="mt-2 lg:hidden">
              <AdminMobileNavigation>
                {navigation.map(group => <nav aria-label={group.label + " mobile"} key={group.label} className="space-y-2">
                  <p className="px-3 text-xs font-medium text-muted-foreground">{group.label}</p>
                  <SidebarMenu>{group.items.map(item => <SidebarMenuItem key={item.area}><AdminNavLink active={active} item={item} /></SidebarMenuItem>)}</SidebarMenu>
                </nav>)}
                <Separator />
                <Button nativeButton={false} role="link" render={<Link href="/" />} variant="ghost" className="w-full justify-start"><ExternalLink aria-hidden className="size-4" />Situs publik</Button>
              </AdminMobileNavigation>
            </div>
          </header>
          <div className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><div className="mx-auto w-full max-w-admin">{children}</div></div>
        </SidebarInset>
      </AdminSidebarLayout>
    </div>
  );
}

function AdminLogo({ className }: Readonly<{ className: string }>) {
  return <Image alt="Niuva logo" className={className} height={346} priority src="/assets/brand/niuva-logo-horizontal-light.svg" width={1831} />;
}

function AdminDesktopNavLink({ active, item }: Readonly<{ active: AdminArea; item: NavigationItem }>) {
  const Icon = navigationIcons[item.icon];
  return (
    <AdminSidebarLink active={item.area === active} href={item.href} label={item.label}>
      <Icon aria-hidden="true" className="size-4 shrink-0" />
    </AdminSidebarLink>
  );
}

function AdminNavLink({ active, item }: Readonly<{ active: AdminArea; item: NavigationItem }>) {
  const Icon = navigationIcons[item.icon];
  return <SidebarMenuButton isActive={item.area === active} render={<Link href={item.href} aria-current={item.area === active ? "page" : undefined} />}>
    <Icon aria-hidden className="size-4" />{item.label}
  </SidebarMenuButton>;
}

export function AdminDataUnavailableView({
  active = "overview",
  kind,
  role,
  title = "Data operasional belum dapat dimuat",
}: Readonly<{ active?: AdminArea; kind?: FailureKind; role: AdminRole; title?: string }>) {
  const retryHref = active === "overview" ? "/admin" : active === "queue" ? "/admin/queue" :
    active === "search" ? "/admin/search" : active === "activity" ? "/admin/activity" : active === "account" ? "/admin/account" :
    getAdminNavigationForRole(role).flatMap(group => group.items).find((item) => item.area === active)?.href ?? "/admin";
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
  query = {},
}: Readonly<{
  basePath: string;
  hasNext: boolean;
  page: number;
  query?: Readonly<Record<string, string>>;
}>) {
  if (page === 1 && !hasNext) return null;

  const pageHref = (targetPage: number) => isAdminRootPath(basePath)
    ? buildAdminPageHref(basePath, query, targetPage)
    : `${basePath}?${new URLSearchParams({ ...query, page: String(targetPage) })}`;

  return (
    <nav aria-label="Paginasi data admin" className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
      <p className="text-sm text-muted-foreground">Halaman {page}</p>
      <div className="flex flex-wrap gap-2">
        {page > 1 ? (
          <Link className={buttonVariants({ variant: "outline", className: "inline-flex min-h-11 items-center rounded-lg border border-border bg-card px-4 text-sm font-semibold hover:border-brand-400 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" })} href={pageHref(page - 1)}>
            Sebelumnya
          </Link>
        ) : null}
        {hasNext ? (
          <Link className={buttonVariants({ variant: "outline", className: "inline-flex min-h-11 items-center rounded-lg border border-brand-300 bg-brand-50 px-4 text-sm font-semibold text-brand-900 hover:border-brand-500 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" })} href={pageHref(page + 1)}>
            Berikutnya
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
