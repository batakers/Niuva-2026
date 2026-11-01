import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { typographySystemTokens as type } from "@/design/typography";

export default function OrderStatusNotFound() {
  return (
    <PublicShell scope="order-status">
      <main className="mx-auto max-w-public px-5 pt-10 sm:px-12 sm:pt-14" id="main-content">
        <h1 className={`${type.display.className} max-w-3xl text-balance`}>Status pesanan tidak dapat ditampilkan.</h1>
        <div className="mt-8 max-w-2xl">
          <StatusNotice
            action={<NiuvaLink className="min-h-11" href="/" variant="outline">Kembali ke beranda</NiuvaLink>}
            description="Tautan mungkin salah salin atau sudah tidak berlaku. Detail pesanan tidak ditampilkan untuk menjaga keamanan akses."
            title="Periksa kembali tautan dari Niuva."
            tone="warning"
          />
        </div>
      </main>
    </PublicShell>
  );
}
