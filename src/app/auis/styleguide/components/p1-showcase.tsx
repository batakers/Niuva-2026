"use client";

import {
  FileUploadField,
  MoneySummary,
  OrderStatusTimeline,
  VariantSelector,
} from "@/components/niuva";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const checkoutLines = [
  { label: "Prototype display", value: "Rp 1.250.000", detail: "1 unit" },
  { label: "Pengiriman", value: "Rp 85.000", detail: "Alamat fixture" },
  { label: "Biaya layanan", value: "Rp 12.500" },
] as const;

const quoteLines = [
  { label: "Material ABS", value: "Rp 420.000", detail: "Estimasi dari quote operator" },
  { label: "Proses dan finishing", value: "Rp 380.000" },
] as const;

const retailSteps = [
  {
    id: "retail-paid",
    label: "Pembayaran diterima",
    state: "completed" as const,
    timestamp: "28 Agustus 2026 · 09:14",
  },
  {
    id: "retail-preparation",
    label: "Persiapan order",
    state: "current" as const,
    description: "Tim menyiapkan item dan pemeriksaan akhir.",
  },
  {
    id: "retail-shipping",
    label: "Diserahkan ke pengiriman",
    state: "pending" as const,
  },
] as const;

const customQuoteSteps = [
  {
    id: "quote-received",
    label: "File diterima",
    state: "completed" as const,
    timestamp: "28 Agustus 2026 · 08:42",
  },
  {
    id: "quote-delayed",
    label: "Review operator",
    state: "delayed" as const,
    description: "Review membutuhkan pemeriksaan tambahan sebelum quote dikirim.",
  },
  {
    id: "quote-action",
    label: "Quote dan persetujuan",
    state: "pending" as const,
  },
] as const;

const variantOptions = [
  {
    id: "blue",
    label: "Niuva Blue",
    detail: "Finishing matte · 120 mm",
    price: "Rp 1.250.000",
    swatchTone: "brand" as const,
  },
  {
    id: "natural",
    label: "Natural ABS",
    detail: "Finishing matte · 120 mm",
    price: "Rp 1.180.000",
    swatchTone: "neutral" as const,
  },
] as const;

function PreviewAction({ children, variant = "outline" }: { children: string; variant?: "default" | "outline" }) {
  return (
    <Button size="sm" type="button" variant={variant}>
      {children}
    </Button>
  );
}

export function P1ComponentShowcase() {
  return (
    <section className="scroll-mt-8 space-y-6" data-component-showcase="p1" id="p1-components">
      <div className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.12em] text-brand-700">
          Design System / P1 official components
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Komponen untuk workflow yang berwenang</h2>
        <p className="max-w-3xl leading-7 text-muted-foreground">
          Empat komponen P1 ini menerima nilai, ketersediaan, file policy, dan
          status dari server atau domain flow. Fixture di bawah hanya membuktikan
          hierarchy, recovery, dan aksesibilitas; tidak ada data produksi yang
          terhubung.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">MoneySummary</h3>
            <p className="text-sm text-muted-foreground">Nilai ditampilkan, bukan dihitung oleh UI.</p>
          </div>
          <Badge variant="secondary">P1 / official</Badge>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <MoneySummary
            description="Rincian dari server untuk ready-made checkout fixture."
            lines={checkoutLines}
            note="Server checkout · snapshot fixture"
            title="Ready-made checkout"
            total="Rp 1.347.500"
            currency="IDR"
            variant="checkout"
          />
          <MoneySummary
            action={<PreviewAction>Periksa ulang quote</PreviewAction>}
            description="Quote yang sudah diterima dan masih menunggu revalidasi sebelum pembayaran."
            lines={quoteLines}
            note="Operator quote · fixture diterima"
            sourceStatus="changed"
            title="Accepted custom quote"
            total="Rp 800.000"
            currency="IDR"
            variant="quote"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <MoneySummary
            lines={[]}
            sourceStatus="loading"
            title="Loading state"
            total="—"
            currency="IDR"
            variant="compact"
          />
          <MoneySummary
            action={<PreviewAction>Lengkapi alamat</PreviewAction>}
            lines={[]}
            sourceStatus="unavailable"
            title="Unavailable state"
            total="—"
            currency="IDR"
            variant="compact"
          />
          <MoneySummary
            action={<PreviewAction>Muat ulang rincian</PreviewAction>}
            lines={[]}
            sourceStatus="error"
            title="Error state"
            total="—"
            currency="IDR"
            variant="compact"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">FileUploadField</h3>
            <p className="text-sm text-muted-foreground">Private file lifecycle dengan policy yang terlihat.</p>
          </div>
          <Badge variant="secondary">P1 / official</Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FileUploadField
            acceptedExtensions={[".stl", ".3mf", ".obj"]}
            description="Berkas tetap privat dan hanya tersedia untuk review operator."
            id="p1-upload-idle"
            label="Berkas custom print"
            maxSizeLabel="Maks. sesuai policy server"
            status="idle"
          />
          <FileUploadField
            acceptedExtensions={[".stl", ".3mf", ".obj"]}
            description="Metadata berasal dari validasi server, bukan asumsi browser."
            fileMeta="STL · 4,2 MB · accepted by server"
            fileName="housing-prototype.stl"
            id="p1-upload-accepted"
            label="Berkas diterima"
            maxSizeLabel="Maks. sesuai policy server"
            onRemove={() => undefined}
            status="accepted"
          />
          <FileUploadField
            acceptedExtensions={[".stl", ".3mf", ".obj"]}
            description="Format dan ukuran diverifikasi sebelum masuk review."
            error="Gunakan format STL, 3MF, atau OBJ dan pastikan ukurannya sesuai policy server."
            fileName="draft-export.zip"
            id="p1-upload-invalid"
            label="Berkas perlu diperbaiki"
            maxSizeLabel="Maks. sesuai policy server"
            status="invalid"
          />
          <FileUploadField
            acceptedExtensions={[".stl", ".3mf", ".obj"]}
            description="Progress dipresentasikan sebagai status, tanpa animasi dekoratif."
            fileMeta="STL · metadata menunggu server"
            fileName="bracket-revision.stl"
            id="p1-upload-validating"
            label="Berkas sedang diperiksa"
            maxSizeLabel="Maks. sesuai policy server"
            size="compact"
            status="validating"
          />
          <FileUploadField
            acceptedExtensions={[".stl", ".3mf", ".obj"]}
            description="Recovery action mengembalikan pengguna ke langkah yang dapat dilakukan."
            error="Sesi upload berakhir sebelum berkas selesai diproses."
            fileName="mounting-plate.stl"
            id="p1-upload-expired"
            label="Sesi upload berakhir"
            maxSizeLabel="Maks. sesuai policy server"
            onRetry={() => undefined}
            size="compact"
            status="expired"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">OrderStatusTimeline</h3>
            <p className="text-sm text-muted-foreground">Tahapan publik yang tidak mengekspos transition internal.</p>
          </div>
          <Badge variant="secondary">P1 / official</Badge>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <OrderStatusTimeline
            action={<PreviewAction>Lihat bantuan order</PreviewAction>}
            description="Status yang aman dibaca customer untuk ready-made order."
            nextExpectation="Order akan diserahkan setelah pemeriksaan akhir."
            steps={retailSteps}
            title="Order DEMO-026"
            variant="retail-order"
          />
          <OrderStatusTimeline
            action={<PreviewAction>Hubungi operator</PreviewAction>}
            description="Quote custom tetap menunggu review operator."
            nextExpectation="Operator memberi kabar setelah pemeriksaan tambahan selesai."
            size="compact"
            steps={customQuoteSteps}
            title="Custom quote DEMO-025"
            variant="custom-quote"
          />
        </div>
        <OrderStatusTimeline
          description="State recovery dan access boundary tetap berupa label publik."
          size="compact"
          steps={[
            { id: "failed", label: "Pembayaran", state: "failed", description: "Pembayaran belum terkonfirmasi." },
            { id: "cancelled", label: "Order dibatalkan", state: "cancelled" },
            { id: "expired", label: "Akses status", state: "access-expired", description: "Minta tautan status baru." },
          ]}
          title="Recovery states"
          variant="retail-order"
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">VariantSelector</h3>
            <p className="text-sm text-muted-foreground">Pilihan retail mengikuti ketersediaan dari server.</p>
          </div>
          <Badge variant="secondary">P1 / official</Badge>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <VariantSelector
              defaultSelectedId="blue"
              description="Gunakan swatch ketika perbedaan visual menjadi pembanding utama."
              label="Finishing"
              name="p1-finish-swatch"
              options={variantOptions}
              variant="swatch"
            />
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <VariantSelector
              defaultSelectedId="standard"
              description="Stok ditampilkan sebagai teks dan tidak dipercaya dari browser."
              label="Ukuran"
              name="p1-size-list"
              options={[
                { id: "standard", label: "Standard", detail: "120 mm", price: "Rp 1.250.000" },
                { id: "large", label: "Large", detail: "180 mm", price: "Rp 1.600.000", availability: "revalidated" },
                { id: "sample", label: "Sample", detail: "Trial batch", availability: "out-of-stock" },
              ]}
              variant="list"
            />
          </div>
          <div className="rounded-xl border border-border bg-card p-4 shadow-card">
            <VariantSelector
              defaultSelectedId="matte"
              description="Loading option tetap menjelaskan kenapa pilihan belum dapat digunakan."
              error="Pilih finishing sebelum melanjutkan."
              label="Finishing detail"
              name="p1-finish-radio"
              options={[
                { id: "matte", label: "Matte", detail: "Surface low-reflection" },
                { id: "gloss", label: "Gloss", detail: "Ketersediaan sedang dimuat", availability: "loading" },
              ]}
              size="compact"
              variant="radio"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
        <span className="size-2 rounded-full bg-success" />
        <span>P1 contracts implemented and showcased. Screen propagation remains gated by the Design System checkpoint.</span>
      </div>
    </section>
  );
}
