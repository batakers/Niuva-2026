import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { AuLink } from "@/components/ui/AuLink";

export default function QuoteNotFound() {
  return (
    <PublicShell scope="quote-unavailable">
      <main className="mx-auto max-w-public px-5 py-16 sm:px-8 sm:py-24" id="main-content">
        <p className="text-sm font-medium text-brand-700">Akses quote</p>
        <h1 className={`${type.display.className} mt-4 max-w-3xl`}>
          Quote tidak dapat ditampilkan.
        </h1>
        <div className="mt-8 max-w-2xl">
          <StatusNotice
            action={<AuLink className="min-h-11" href="/custom-print" variant="outline">Lihat proses custom print</AuLink>}
            description="Tautan mungkin tidak sesuai, sudah dicabut, atau belum terhubung ke quote yang dapat diakses. Tidak ada informasi quote yang dibuka."
            title="Periksa kembali tautan dari Niuva."
            tone="warning"
          />
        </div>
      </main>
    </PublicShell>
  );
}
