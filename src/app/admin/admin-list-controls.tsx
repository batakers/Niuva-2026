import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { NativeInput as Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { adminStatusLabel, adminStatusOptions, type AdminListQuery, type AdminSearchArea } from "@/modules/admin/list-query";

const searchLabels: Record<AdminSearchArea, string> = { orders: "Cari nomor order", inquiries: "Cari referensi brief", "custom-print": "Cari referensi permintaan", products: "Cari nama atau tautan produk", portfolio: "Cari judul atau tautan portfolio" };

export function AdminListControls({ area, query }: Readonly<{ area: AdminSearchArea; query: AdminListQuery }>) {
  const path = `/admin/${area}`;
  return <Card className="mt-6 py-0"><CardContent className="p-4">
    <form role="search" aria-label="Cari dan filter daftar" action={path} method="get" className="flex flex-wrap items-end gap-4">
      {query.view ? <><input name="view" type="hidden" value={query.view} /><p className="w-full text-sm font-medium">{query.view === "issues" ? "Menampilkan pembayaran atau pengiriman yang perlu diperiksa" : "Menampilkan pekerjaan yang perlu tindakan"}</p></> : null}
      <div className="grid min-w-0 flex-1 basis-60 gap-2"><Label htmlFor="admin-list-search">{searchLabels[area]}</Label><Input defaultValue={query.q ?? ""} id="admin-list-search" maxLength={100} name="q" type="search" /></div>
      {adminStatusOptions[area] ? <div className="grid min-w-0 flex-1 basis-44 gap-2"><Label htmlFor="admin-list-status">Status</Label><NativeSelect defaultValue={query.status ?? ""} id="admin-list-status" name="status"><NativeSelectOption value="">Semua status</NativeSelectOption>{adminStatusOptions[area]?.map(status => <NativeSelectOption key={status} value={status}>{adminStatusLabel(status)}</NativeSelectOption>)}</NativeSelect></div> : null}
      {area === "orders" ? <div className="grid min-w-0 flex-1 basis-44 gap-2"><Label htmlFor="admin-list-type">Jenis order</Label><NativeSelect defaultValue={query.type ?? ""} id="admin-list-type" name="type"><NativeSelectOption value="">Semua jenis</NativeSelectOption><NativeSelectOption value="RETAIL">Retail</NativeSelectOption><NativeSelectOption value="CUSTOM_PRINT">Custom Print</NativeSelectOption></NativeSelect></div> : null}
      {area === "products" || area === "portfolio" ? <div className="grid min-w-0 flex-1 basis-44 gap-2"><Label htmlFor="admin-list-publication">Publikasi</Label><NativeSelect defaultValue={query.publication ?? ""} id="admin-list-publication" name="publication"><NativeSelectOption value="">Semua publikasi</NativeSelectOption><NativeSelectOption value="published">Terpublikasi</NativeSelectOption><NativeSelectOption value="draft">Draf</NativeSelectOption></NativeSelect></div> : null}
      <div className="flex flex-wrap gap-2"><Button type="submit">Terapkan</Button><Button nativeButton={false} role="link" variant="ghost" render={<Link href={path} />}>Reset filter</Button></div>
    </form>
  </CardContent></Card>;
}
