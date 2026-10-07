import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { adminRootLabel } from "@/modules/admin/navigation";

export function AdminPageHeader({ title, description, breadcrumbs = [], returnHref, returnLabel = "Kembali ke daftar", actions }: Readonly<{
  title: string;
  description?: ReactNode;
  breadcrumbs?: readonly Readonly<{ label: string; href?: string }>[];
  returnHref?: string;
  returnLabel?: string;
  actions?: ReactNode;
}>) {
  return <header className="mb-6 space-y-3">
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Link className="inline-flex min-h-11 items-center rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href="/admin">Admin</Link>
      {breadcrumbs.map((crumb, index) => <span className="inline-flex items-center gap-2" key={`${crumb.label}-${index}`}>
        <ChevronRight aria-hidden="true" className="size-3" />
        {crumb.href ? <Link className="inline-flex min-h-11 items-center rounded-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={crumb.href}>{adminRootLabel(crumb.href) ?? crumb.label}</Link> : <span aria-current={index === breadcrumbs.length - 1 ? "page" : undefined}>{crumb.label}</span>}
      </span>)}
    </nav>
    {returnHref ? <Link className="inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={returnHref}><ArrowLeft aria-hidden="true" className="size-4" />{adminRootLabel(returnHref) ? `Kembali ke ${adminRootLabel(returnHref)}` : returnLabel}</Link> : null}
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>{description ? <div className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{description}</div> : null}</div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  </header>;
}
