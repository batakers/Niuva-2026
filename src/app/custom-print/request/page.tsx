import type { Metadata } from "next";
import { Check, FileSearch, ShieldCheck } from "lucide-react";

import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import { PublicShell } from "@/components/niuva/public-shell";
import { AuLink } from "@/components/ui/AuLink";
import { RequestForm } from "./request-form";

export const metadata: Metadata = {
  title: "Request Custom 3D Print · Niuva",
  description:
    "Siapkan metadata file, konfigurasi awal, dan kontak untuk preview request custom 3D print Niuva.",
};

const readinessItems = [
  "Satu file model atau lampiran review manual.",
  "Material, warna, jumlah, dan unit atau skala.",
  "Kontak yang dapat dipakai untuk pembahasan operator.",
] as const;

export default function CustomPrintRequestPage() {
  return (
    <PublicShell scope="custom-request">
      <main id="main-content" data-custom-request>
        <section className="border-b border-border bg-card">
          <div className="mx-auto grid max-w-public gap-8 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <p className="text-sm font-medium text-brand-700">Request Custom 3D Print</p>
              <h1 className={`${type.display.className} mt-4 max-w-3xl text-balance`}>
                Siapkan file untuk review operator.
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-muted-foreground">
                Preview ini memeriksa metadata dan konfigurasi tanpa mengunggah isi file atau membuat request nyata.
              </p>
            </div>

            <aside className="rounded-xl bg-brand-950 p-6 text-neutral-50 lg:col-span-5" aria-labelledby="readiness-title">
              <div className="flex items-center gap-3">
                <FileSearch aria-hidden="true" className="size-5 text-brand-300" />
                <h2 className="text-base font-semibold" id="readiness-title">Yang perlu disiapkan</h2>
              </div>
              <ul className="mt-5 space-y-3">
                {readinessItems.map((item) => (
                  <li className="flex gap-3 text-sm leading-6 text-neutral-300" key={item}>
                    <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-brand-300" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </section>

        <section className="bg-background">
          <div className="mx-auto grid max-w-public gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-12 lg:gap-12">
            <aside className="space-y-8 lg:col-span-4 lg:sticky lg:top-8 lg:self-start">
              <div>
                <p className="text-sm font-medium text-brand-700">Batas preview</p>
                <h2 className={`${type.heading.className} mt-3`}>Metadata terlihat. Isi file tetap di perangkat.</h2>
                <p className="mt-5 text-sm leading-6 text-muted-foreground">
                  Browser hanya memakai nama, ekstensi, dan ukuran untuk simulasi. Tidak ada file ID, storage key, atau signed URL yang dibuat.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-card p-5">
                <ShieldCheck aria-hidden="true" className="size-6 text-brand-700" />
                <h3 className="mt-4 text-base font-semibold">Review manusia tetap wajib</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Status preview tidak menentukan kelayakan cetak, harga final, atau jadwal produksi.
                </p>
              </div>
              <AuLink className="min-h-11" href="/custom-print" variant="outline">Kembali ke penjelasan proses</AuLink>
            </aside>

            <div className="lg:col-span-8">
              <RequestForm previewEnabled={process.env.NODE_ENV === "development"} />
            </div>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
