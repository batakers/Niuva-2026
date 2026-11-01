import { typographySystemTokens as type } from "@/design/typography";
import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { NiuvaLink } from "@/components/ui/NiuvaLink";

export default function QuoteNotFound() {
  return (
    <PublicShell scope="quote-unavailable">
      <main className="mx-auto max-w-public px-5 pt-10 sm:px-12 sm:pt-14" id="main-content">
        <h1 className={`${type.display.className} max-w-3xl text-balance`}>
          Quote tidak dapat ditampilkan.
        </h1>
        <div className="mt-8 max-w-2xl">
          <StatusNotice
            action={<NiuvaLink className="min-h-11" href="/custom-print" variant="outline">Lihat Custom 3D Print</NiuvaLink>}
            description="Tautan mungkin salah salin, sudah dicabut, atau belum terhubung ke quote. Tidak ada informasi quote yang dibuka."
            title="Periksa kembali tautan dari Niuva."
            tone="warning"
          />
        </div>
      </main>
    </PublicShell>
  );
}
