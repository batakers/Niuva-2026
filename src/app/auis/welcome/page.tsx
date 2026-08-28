import type { Metadata } from "next";

import AuLogo from "@/components/ui/AuLogo";
import brandRuntime from "../_data/brand.runtime.json";
import BrandIntakeForm from "./brand-intake-form";

export const metadata: Metadata = {
  title: "Pengaturan brand · Niuva",
  description: brandRuntime.tagline,
};

export default function AuisWelcomePage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12 text-zinc-950 sm:py-16">
      <div className="mx-auto max-w-3xl space-y-10">
        <header className="space-y-5">
          <AuLogo
            className="h-auto w-60"
            priority
          />
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-zinc-600">
            Setup AUiS · Langkah 1 dari 3
          </p>
          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Tinjau identitas brand Niuva
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-zinc-700">
              {brandRuntime.tagline}
            </p>
          </div>
        </header>

        <section
          aria-labelledby="brand-intake-heading"
          className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="space-y-2">
            <h2 className="text-xl font-semibold" id="brand-intake-heading">
              Data brand Niuva
            </h2>
            <p className="leading-7 text-zinc-600">
              Data brand berasal dari wawancara dengan owner. Tinjau lalu simpan
              perubahan selama setup lokal.
            </p>
          </div>
          <BrandIntakeForm initial={brandRuntime} />
        </section>

        <aside className="border-l-2 border-zinc-300 pl-4 text-sm leading-6 text-zinc-600">
          Brand, Foundation, dan Voice sudah tersedia. Form ini mempertahankan
          <code className="mx-1 rounded bg-zinc-100 px-1 py-0.5">
            configured: {String(brandRuntime.configured)}
          </code>
          saat data brand disimpan.
        </aside>
      </div>
    </main>
  );
}
