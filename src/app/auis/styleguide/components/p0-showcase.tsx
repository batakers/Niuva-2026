import {
  ActionQueueItem,
  EvidenceCard,
  FormField,
  StatusNotice,
} from "@/components/niuva";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/input";

function ProcessMarker() {
  return (
    <div className="grid gap-3 bg-neutral-900 p-4 text-neutral-50 sm:grid-cols-3">
      {["Riset", "Engineering", "Prototype"].map((step, index) => (
        <div className="space-y-2" key={step}>
          <p className="text-xs tabular-nums text-brand-300">0{index + 1}</p>
          <p className="text-xs font-medium">{step}</p>
          <div className={index === 1 ? "h-1.5 rounded-full bg-brand-500" : "h-1.5 rounded-full bg-neutral-700"} />
        </div>
      ))}
    </div>
  );
}

export function P0ComponentShowcase() {
  return (
    <section
      className="scroll-mt-8 space-y-6"
      data-component-showcase="p0"
      data-visual-review="approved"
      data-visual-review-scope="styleguide-only"
      id="p0-components"
    >
      <div className="space-y-2">
        <p className="text-sm font-medium text-brand-700">
          Design System · komponen P0 resmi
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">Komponen yang membawa konteks Niuva</h2>
        <p className="max-w-3xl leading-7 text-muted-foreground">
          Empat komponen P0 ini sudah diturunkan dari kontrak yang disetujui.
          Mereka mengatur bahasa, struktur, dan state UI; keputusan bisnis tetap
          datang dari server dan domain flow.
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">EvidenceCard</h3>
            <p className="text-sm text-muted-foreground">Bukti nyata sebelum klaim.</p>
          </div>
          <Badge>P0 · visual approved</Badge>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <EvidenceCard
            actionLabel="Buka project"
            description="Ringkasan project yang menghubungkan kebutuhan, proses, dan hasil yang dapat dibuktikan."
            eyebrow="Project · proof"
            href="#p0-components"
            media={<ProcessMarker />}
            mediaAlt="Diagram proses dari riset, engineering, hingga prototype"
            meta={["Riset", "Engineering"]}
            title="Perangkat yang lahir dari proses terukur"
            variant="project"
          />
          <EvidenceCard
            description="Urutan kerja yang membantu calon klien memahami bagaimana ide bergerak menuju prototype."
            eyebrow="Process · method"
            meta={["Idea", "Prototype"]}
            size="compact"
            title="Dari ide menuju bentuk yang bisa diuji"
            variant="process"
          />
          <EvidenceCard
            description="Capability dijelaskan melalui material, tooling, dan tahap produksi yang benar-benar tersedia."
            eyebrow="Capability · making"
            meta={["Material", "Manufacturing"]}
            title="Tangible capability, bukan jargon"
            variant="capability"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">FormField</h3>
            <p className="text-sm text-muted-foreground">Label, helper, dan recovery dalam satu hubungan aksesibel.</p>
          </div>
          <Badge>P0 · visual approved</Badge>
        </div>
        <div className="grid gap-4 rounded-xl border border-border bg-card p-5 shadow-card md:grid-cols-2">
          <FormField
            control={<Input placeholder="Contoh: NIUVA-2026-001" />}
            description="Gunakan referensi yang mudah dibaca saat melanjutkan komunikasi."
            id="p0-project-reference"
            label="Referensi proyek"
            required
          />
          <FormField
            control={<Input defaultValue="NIUVA-OLD-000" />}
            error="Referensi belum ditemukan. Periksa kembali format atau mulai brief baru."
            id="p0-invalid-reference"
            label="Cari project brief"
            variant="compact"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">StatusNotice</h3>
            <p className="text-sm text-muted-foreground">Status selalu menyebutkan keadaan dan tindakan berikutnya.</p>
          </div>
          <Badge>P0 · visual approved</Badge>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <StatusNotice
            actionLabel="Lanjutkan pemeriksaan"
            description="Berkas sudah diterima dan operator dapat melanjutkan pemeriksaan."
            title="Berkas siap ditinjau"
            tone="success"
          />
          <StatusNotice
            actionLabel="Buka detail geometri"
            description="Custom 3D Print membutuhkan verifikasi sebelum quote dapat dibuat."
            reason="Harga final belum dapat ditentukan dari file saja."
            title="Perlu pemeriksaan operator"
            tone="warning"
          />
          <StatusNotice
            actionLabel="Perbarui pilihan"
            ariaLive="assertive"
            description="Stok berubah sehingga pesanan belum dapat dilanjutkan."
            title="Pesanan perlu diperiksa"
            tone="error"
          />
          <StatusNotice
            actionLabel="Tunggu quote"
            description="Operator sedang memeriksa berat dan durasi slicer."
            title="Quote akan dikirim operator"
            tone="info"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">ActionQueueItem</h3>
            <p className="text-sm text-muted-foreground">Pekerjaan operator yang siap diputuskan, bukan baris database mentah.</p>
          </div>
          <Badge>P0 · visual approved</Badge>
        </div>
        <div aria-label="Fixture action queue" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" role="list">
          <ActionQueueItem
            kind="inquiry"
            primaryAction={<Button size="sm" type="button">Buka brief</Button>}
            reference="DEMO-026"
            status="new"
            summary="Brief perangkat display membutuhkan konteks material"
            updatedAt="baru saja"
          />
          <ActionQueueItem
            kind="custom-review"
            primaryAction={<Button size="sm" type="button">Mulai review</Button>}
            reference="DEMO-025"
            status="waiting"
            summary="File custom menunggu verifikasi operator"
            updatedAt="12 menit lalu"
          />
          <ActionQueueItem
            kind="order"
            primaryAction={<Button size="sm" type="button">Lanjutkan order</Button>}
            reference="DEMO-024"
            status="in-progress"
            summary="Pembayaran sedang menunggu konfirmasi"
            updatedAt="28 menit lalu"
          />
          <ActionQueueItem
            kind="package"
            primaryAction={<Button size="sm" type="button" variant="destructive">Periksa kendala</Button>}
            reference="DEMO-023"
            status="blocked"
            summary="Pengukuran paket belum tersedia"
            updatedAt="1 jam lalu"
          />
          <ActionQueueItem
            kind="order"
            primaryAction={<Button size="sm" type="button" variant="outline">Lihat riwayat</Button>}
            reference="DEMO-022"
            status="completed"
            summary="QC selesai dan order siap diteruskan"
            updatedAt="kemarin"
          />
          <ActionQueueItem
            kind="custom-review"
            primaryAction={<Button size="sm" type="button">Konfirmasi tindakan</Button>}
            reference="DEMO-021"
            status="action-pending"
            summary="Operator menunggu konfirmasi langkah berikutnya"
            updatedAt="hari ini"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
        <Icon aria-hidden="true" className="size-4 text-success" name="check-circle-2" />
        <span>Visual gate P0 disetujui untuk styleguide; icon, state, dan tindakan di atas tetap tidak terhubung ke data produksi.</span>
        <Icon aria-hidden="true" className="hidden size-4 sm:block" name="arrow-right" />
        <span className="hidden sm:block">P1 tersedia di showcase berikutnya; propagasi layar mengikuti task page/route ter-scope.</span>
      </div>
    </section>
  );
}
