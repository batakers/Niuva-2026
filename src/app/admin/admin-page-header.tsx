import { Fragment, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { adminRootLabel } from "@/modules/admin/navigation";

export function AdminPageHeader({ title, description, breadcrumbs = [], returnHref, returnLabel = "Kembali ke daftar", actions }: Readonly<{
  title: string;
  description?: ReactNode;
  breadcrumbs?: readonly Readonly<{ label: string; href?: string }>[];
  returnHref?: string;
  returnLabel?: string;
  actions?: ReactNode;
}>) {
  const linkClass = "inline-flex min-h-11 items-center rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
  return <header className="mb-6 min-w-0 space-y-3" data-admin-page-header>
    <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-1">
      {returnHref ? <Button nativeButton={false} role="link" variant="ghost" className="max-w-full justify-start px-0 text-primary" render={<Link href={returnHref} />}><ArrowLeft aria-hidden className="size-4" /><span className="min-w-0 break-words">{adminRootLabel(returnHref) ? `Kembali ke ${adminRootLabel(returnHref)}` : returnLabel}</span></Button> : null}
      <Breadcrumb>
        <BreadcrumbList className="text-xs">
          <BreadcrumbItem><Link className={linkClass} href="/admin">Admin</Link></BreadcrumbItem>
          {breadcrumbs.map((crumb, index) => <Fragment key={`${crumb.label}-${index}`}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>{crumb.href ? <Link className={linkClass} href={crumb.href}>{adminRootLabel(crumb.href) ?? crumb.label}</Link> : <BreadcrumbPage role={undefined} aria-disabled={undefined} aria-current={index === breadcrumbs.length - 1 ? "page" : undefined} className="break-all">{crumb.label}</BreadcrumbPage>}</BreadcrumbItem>
          </Fragment>)}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0"><h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>{description ? <div className="mt-2 max-w-3xl break-words text-sm leading-6 text-muted-foreground">{description}</div> : null}</div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  </header>;
}
