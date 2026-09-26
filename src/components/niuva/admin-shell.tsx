import type { ReactNode } from "react";
import Link from "next/link";
import type { AdminRole } from "@/generated/prisma/client";
import AuLogo from "@/components/ui/AuLogo";
import { AdminSessionActions } from "./admin-session-actions";

export type AdminArea =
  | "queue"
  | "orders"
  | "custom-print"
  | "products"
  | "portfolio"
  | "inquiries"
  | "pricing";

const navigation: readonly Readonly<{ area: AdminArea; href: string; label: string }>[] = [
  { area: "queue", href: "/admin", label: "Action Queue" },
  { area: "orders", href: "/admin/orders", label: "Orders" },
  { area: "custom-print", href: "/admin/custom-print", label: "Custom Print" },
  { area: "products", href: "/admin/products", label: "Products & Stock" },
  { area: "portfolio", href: "/admin/portfolio", label: "Portfolio" },
  { area: "inquiries", href: "/admin/inquiries", label: "B2B Inquiries" },
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
  return (
    <div
      className="min-h-screen bg-muted text-foreground"
      data-foundation-propagation="approved"
      data-foundation-scope="admin"
      data-product-screen-proof-status="approved-owner"
      data-typography-propagation="approved"
      data-typography-version="1.0"
    >
      <div className="mx-auto grid max-w-admin gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <aside className="dark h-fit rounded-xl bg-background p-4 text-foreground lg:sticky lg:top-6" aria-label="Navigasi admin">
          <Link href="/admin" aria-label="Niuva Admin, kembali ke Action Queue" className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <AuLogo className="h-8 w-auto" priority />
          </Link>
          <p className="mt-6 text-xs font-medium uppercase tracking-[0.12em] text-brand-300">Operations</p>
          <nav className="mt-3 grid gap-1" aria-label="Menu operasional">
            {navigation.map((item) => (
              <Link
                aria-current={item.area === active ? "page" : undefined}
                className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-neutral-300 transition-colors hover:bg-neutral-800 hover:text-neutral-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:bg-brand-900 aria-[current=page]:text-neutral-50"
                href={item.href}
                key={item.area}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="mt-6 border-t border-neutral-700 pt-4">
            <p className="text-xs text-neutral-400">Masuk sebagai</p>
            <p className="mt-1 text-sm font-medium text-neutral-50">{roleLabels[role]}</p>
            <Link className="mt-4 inline-flex min-h-11 items-center text-sm text-brand-300 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/">
              Lihat situs publik
            </Link>
            <div className="mt-4">
              <AdminSessionActions dark showLogout={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)} />
            </div>
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

export function AdminDataUnavailableView({
  role,
  title = "Data operasional belum dapat dimuat",
}: Readonly<{ role: AdminRole; title?: string }>) {
  return (
    <main className="rounded-xl border border-destructive-border bg-card p-6 sm:p-8" id="main-content">
      <p className="text-sm font-medium text-brand-700">Niuva / Admin</p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
        Sesi {roleLabels[role]} tersedia, tetapi sumber data sedang tidak dapat dijangkau. Coba muat ulang tanpa mengubah data.
      </p>
      <p className="mt-5 text-sm font-medium text-destructive" role="alert">Tidak ada perubahan operasional yang dibuat.</p>
      <div className="mt-6">
        <AdminSessionActions retryHref="/admin" showLogout={Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY)} />
      </div>
    </main>
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
