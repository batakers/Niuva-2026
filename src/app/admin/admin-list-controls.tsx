import Link from "next/link";
import { adminStatusLabel, adminStatusOptions, type AdminListQuery, type AdminSearchArea } from "@/modules/admin/list-query";

const searchLabels: Record<AdminSearchArea, string> = { orders: "Cari nomor order", inquiries: "Cari referensi inquiry", "custom-print": "Cari referensi request", products: "Cari nama atau slug produk", portfolio: "Cari judul atau slug portfolio" };
const controlClass = "mt-1 min-h-11 w-full rounded-lg border border-border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function AdminListControls({ area, query }: Readonly<{ area: AdminSearchArea; query: AdminListQuery }>) {
  const path = `/admin/${area}`;
  return <form role="search" aria-label="Cari dan filter daftar" action={path} method="get" className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4">
    <label className="min-w-0 flex-1 text-xs font-medium text-muted-foreground" htmlFor="admin-list-search">{searchLabels[area]}<input className={controlClass} defaultValue={query.q ?? ""} id="admin-list-search" maxLength={100} name="q" type="search" /></label>
    {adminStatusOptions[area] ? <label className="text-xs font-medium text-muted-foreground" htmlFor="admin-list-status">Status<select className={controlClass} defaultValue={query.status ?? ""} id="admin-list-status" name="status"><option value="">Semua status</option>{adminStatusOptions[area]?.map(status => <option key={status} value={status}>{adminStatusLabel(status)}</option>)}</select></label> : null}
    {area === "orders" ? <label className="text-xs font-medium text-muted-foreground" htmlFor="admin-list-type">Jenis order<select className={controlClass} defaultValue={query.type ?? ""} id="admin-list-type" name="type"><option value="">Semua jenis</option><option value="RETAIL">Retail</option><option value="CUSTOM_PRINT">Custom Print</option></select></label> : null}
    {area === "products" || area === "portfolio" ? <label className="text-xs font-medium text-muted-foreground" htmlFor="admin-list-publication">Publikasi<select className={controlClass} defaultValue={query.publication ?? ""} id="admin-list-publication" name="publication"><option value="">Semua publikasi</option><option value="published">Published</option><option value="draft">Draft</option></select></label> : null}
    <button className="inline-flex min-h-11 items-center rounded-lg bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" type="submit">Terapkan</button>
    <Link className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-brand-700 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={path}>Reset filter</Link>
  </form>;
}
