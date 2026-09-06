import type { Metadata } from "next";
import { PublicShell } from "@/components/niuva/public-shell";
import { typographySystemTokens as type } from "@/app/auis/styleguide/foundation/typography-proof";
import { BriefForm } from "./brief-form";

export const metadata: Metadata = { title: "Project brief · Niuva", description: "Susun konteks, tujuan, dan referensi awal untuk percakapan proyek bersama Niuva." };

export default function ProjectBriefPage() {
  return (
    <PublicShell scope="project-brief">
      <main id="main-content">
        <section className="mx-auto grid max-w-public gap-10 px-5 py-12 sm:px-8 sm:py-16 lg:grid-cols-2 lg:items-start lg:gap-16">
          <div className="lg:sticky lg:top-8">
            <p className="text-sm font-medium text-brand-700">Project brief</p>
            <h1 className={`${type.display.className} mt-4`}>Buat langkah awal proyek jadi jelas.</h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-muted-foreground">Ceritakan konteks, tujuan, dan tahap proyek. Detail yang belum pasti bisa menjadi bahan percakapan berikutnya.</p>
            <p className={`${type["editorial-accent"].className} mt-8 max-w-lg text-brand-900`}
              data-font-family="fraunces" style={{ fontFamily: "var(--font-public-editorial), Georgia, serif", fontOpticalSizing: "auto", fontSynthesis: "none" }}>
              Keputusan yang baik dimulai dari konteks yang cukup.
            </p>
            <div className="mt-10 border-t border-border pt-6">
              <h2 className={type.subheading.className}>Yang perlu disiapkan</h2>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
                <li>Tujuan, tahap saat ini, dan batasan proyek.</li>
                <li>Perkiraan jumlah serta tanggal target.</li>
                <li>Link referensi yang dapat Anda bagikan.</li>
              </ul>
            </div>
          </div>
          <BriefForm previewEnabled={process.env.NODE_ENV === "development"} />
        </section>
        <section className="border-t border-border bg-card">
          <div className="mx-auto grid max-w-public gap-8 px-5 py-12 sm:px-8 md:grid-cols-2">
            <h2 className={type.heading.className}>Setelah pengiriman tersedia, apa langkah berikutnya?</h2>
            <ol className="divide-y divide-border">
              {[["Review awal", "Tujuan, tahap, dan batasan membantu memahami kebutuhan yang sebenarnya."], ["Percakapan lanjutan", "Pembahasan diarahkan ke riset, desain, prototype, atau dukungan produksi yang relevan."], ["Ruang lingkup bersama", "Detail pekerjaan dan komersial dibahas setelah konteks cukup jelas."]].map(([title, text],index) => <li key={title} className="py-4 first:pt-0"><h3 className="text-base font-semibold">{index + 1}. {title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p></li>)}
            </ol>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
