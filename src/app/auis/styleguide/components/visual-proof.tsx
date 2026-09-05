import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { contrastTokens, motionTokens } from "../foundation/tokens";

const surfaceProofs = [
  {
    key: "public",
    label: "Public",
    eyebrow: "Public · dark stage + light content",
    headline: "Bukti yang membuat ide terasa nyata.",
    description:
      "Narasi editorial, bukti proses, dan aksen terkontrol untuk membantu calon klien memahami cara Niuva bekerja.",
    canvasClass: "border-neutral-700 bg-neutral-900 text-neutral-50",
    panelClass: "border-neutral-700 bg-neutral-800/80",
    mutedClass: "text-neutral-300",
    accentClass: "text-brand-300",
    secondaryClass: "border-neutral-600 text-neutral-50 hover:bg-neutral-800",
    action: "Diskusikan proyek",
    secondaryAction: "Lihat proses",
  },
  {
    key: "checkout",
    label: "Checkout",
    eyebrow: "Checkout · light-first",
    headline: "Tenang saat menyelesaikan pesanan.",
    description:
      "Permukaan terang, hierarki jelas, dan status yang membantu customer menyelesaikan langkah berikutnya.",
    canvasClass: "border-neutral-200 bg-neutral-50 text-neutral-900",
    panelClass: "border-border bg-card",
    mutedClass: "text-neutral-600",
    accentClass: "text-brand-700",
    secondaryClass: "border-neutral-500 text-neutral-900 hover:bg-neutral-100",
    action: "Lanjutkan pesanan",
    secondaryAction: "Kembali ke katalog",
  },
  {
    key: "admin",
    label: "Admin",
    eyebrow: "Admin · dense operational surface",
    headline: "Padat untuk keputusan operasional.",
    description:
      "Kontras yang dapat dipindai, metadata teknis, dan tindakan yang menjaga operator tetap memahami konteks.",
    canvasClass: "border-neutral-300 bg-neutral-100 text-neutral-900",
    panelClass: "border-border bg-card",
    mutedClass: "text-neutral-600",
    accentClass: "text-brand-700",
    secondaryClass: "border-neutral-500 text-neutral-900 hover:bg-neutral-100",
    action: "Tinjau antrian",
    secondaryAction: "Buka detail",
  },
] as const;

const semanticProofs = [
  {
    key: "success",
    label: "Berhasil",
    symbol: "✓",
    title: "Berkas siap ditinjau",
    description: "File sudah diterima dan operator dapat melanjutkan pemeriksaan.",
    action: "Lanjutkan pemeriksaan",
    surfaceClass: "border-success-border bg-success-background",
    iconClass: "border-success-border text-success",
    textClass: "text-success",
  },
  {
    key: "warning",
    label: "Perlu perhatian",
    symbol: "!",
    title: "Perlu pemeriksaan operator",
    description: "Geometri belum menghasilkan harga final secara otomatis.",
    action: "Buka detail geometri",
    surfaceClass: "border-warning-border bg-warning-background",
    iconClass: "border-warning-border text-warning",
    textClass: "text-warning",
  },
  {
    key: "error",
    label: "Terjadi kendala",
    symbol: "×",
    title: "Pesanan belum dapat dilanjutkan",
    description: "Stok berubah. Periksa kembali pilihan produk sebelum mencoba lagi.",
    action: "Perbarui pilihan produk",
    surfaceClass: "border-destructive-border bg-destructive-background",
    iconClass: "border-destructive-border text-destructive",
    textClass: "text-destructive",
  },
  {
    key: "info",
    label: "Informasi",
    symbol: "i",
    title: "Quote akan dikirim operator",
    description: "Custom 3D Print membutuhkan verifikasi berat dan durasi slicer.",
    action: "Tunggu quote operator",
    surfaceClass: "border-info-border bg-info-background",
    iconClass: "border-info-border text-info",
    textClass: "text-info",
  },
] as const;

type SurfaceProof = (typeof surfaceProofs)[number];

function PublicDetail({ proof }: { proof: SurfaceProof }) {
  return (
    <div className={`mt-7 overflow-hidden rounded-xl border ${proof.panelClass}`}>
      <div className="flex items-center justify-between border-b border-inherit px-4 py-3">
        <span className={`text-xs font-medium ${proof.accentClass}`}>
          Niuva · 01
        </span>
        <span className={`text-xs ${proof.mutedClass}`}>
          Ide ke produk
        </span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        {["Riset", "Engineering", "Prototype"].map((step, index) => (
          <div className="min-w-0 space-y-2" key={step}>
            <span className={`text-xs tabular-nums ${proof.mutedClass}`}>0{index + 1}</span>
            <p className="break-words text-xs font-medium">{step}</p>
            <div className={`h-1.5 rounded-full ${index === 1 ? "bg-brand-500" : "bg-neutral-600"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

function CheckoutDetail({ proof }: { proof: SurfaceProof }) {
  return (
    <div className={`mt-7 space-y-4 rounded-xl border p-4 ${proof.panelClass}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-xs font-medium ${proof.accentClass}`}>
            Ready-made · checkout
          </p>
          <p className="mt-1 text-sm font-medium">Desk Organizer — Blue</p>
        </div>
        <Badge variant="secondary">1 item</Badge>
      </div>
      <div className="space-y-2">
        <Label htmlFor="proof-address">Alamat pengiriman</Label>
        <Input id="proof-address" readOnly value="Jakarta Selatan, 12190" />
      </div>
      <div className={`flex items-center justify-between border-t border-neutral-200 pt-3 text-sm ${proof.mutedClass}`}>
        <span>Total sementara</span>
        <span className="font-semibold text-neutral-900">Rp 480.000</span>
      </div>
    </div>
  );
}

function AdminDetail({ proof }: { proof: SurfaceProof }) {
  return (
    <div className={`mt-7 overflow-hidden rounded-xl border ${proof.panelClass}`}>
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
        <span className={`text-xs font-medium ${proof.accentClass}`}>
          Antrian operator
        </span>
        <Badge variant="outline">3 item</Badge>
      </div>
      <div className="divide-y divide-neutral-200">
        {[
            ["NIUVA-026", "Menunggu quote", "warning"],
            ["NIUVA-025", "Siap direview", "success"],
            ["NIUVA-024", "Pembayaran menunggu konfirmasi", "info"],
        ].map(([reference, status, tone]) => (
          <div className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 text-sm" key={reference}>
            <div>
              <p className="font-mono text-xs font-medium">{reference}</p>
              <p className={proof.mutedClass}>{status}</p>
            </div>
            <span className={`text-xs font-medium ${tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-info"}`}>
              {tone === "warning" ? "Perlu perhatian" : tone === "success" ? "Berhasil" : "Informasi"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SurfaceDetail({ proof }: { proof: SurfaceProof }) {
  if (proof.key === "checkout") {
    return <CheckoutDetail proof={proof} />;
  }

  if (proof.key === "admin") {
    return <AdminDetail proof={proof} />;
  }

  return <PublicDetail proof={proof} />;
}

function SurfaceCard({ proof }: { proof: SurfaceProof }) {
  return (
    <article
      aria-labelledby={`surface-proof-${proof.key}`}
      className={`overflow-hidden rounded-2xl border p-5 shadow-card ${proof.canvasClass}`}
      data-proof-surface={proof.key}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-medium ${proof.accentClass}`}>
            {proof.eyebrow}
          </p>
          <h3 className="mt-2 text-lg font-semibold" id={`surface-proof-${proof.key}`}>
            {proof.label}
          </h3>
        </div>
          <span className={`rounded-full border px-2 py-1 text-xs font-medium ${proof.secondaryClass}`}>
          Review visual
        </span>
      </div>

      <div className="mt-8 max-w-sm">
        <p className="text-2xl font-semibold leading-tight tracking-tight">{proof.headline}</p>
        <p className={`mt-3 text-sm leading-6 ${proof.mutedClass}`}>{proof.description}</p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <Button type="button">{proof.action}</Button>
        <span className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${proof.secondaryClass}`}>
          {proof.secondaryAction}
        </span>
      </div>

      <SurfaceDetail proof={proof} />
    </article>
  );
}

function SemanticProof() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {semanticProofs.map((proof) => (
          <article
            className={`rounded-xl border p-4 ${proof.surfaceClass}`}
            data-proof-state={proof.key}
            key={proof.key}
          >
            <div className="flex items-start gap-3">
              <span className={`grid size-8 shrink-0 place-items-center rounded-full border-2 font-semibold ${proof.iconClass}`}>
                <span aria-hidden="true">{proof.symbol}</span>
              </span>
              <div className="min-w-0">
                <p className={`text-xs font-medium ${proof.textClass}`}>
                  {proof.label}
                </p>
                <h3 className="mt-1 text-sm font-semibold">{proof.title}</h3>
                <p className="mt-1 text-sm leading-6 text-current/80">{proof.description}</p>
                <p className="mt-2 text-xs font-medium text-current/90">
                  Tindakan: {proof.action}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="dark rounded-2xl border border-neutral-700 bg-background p-4 text-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-brand-300">
              Pemetaan dark mode
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Semantic state mempertahankan label, simbol, dan recovery action di dark surface.
            </p>
          </div>
          <Badge variant="outline">Pemetaan eksplisit</Badge>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {semanticProofs.map((proof) => (
            <div className={`rounded-lg border p-3 ${proof.surfaceClass}`} key={`dark-${proof.key}`}>
              <p className={`text-xs font-medium ${proof.textClass}`}>{proof.label}</p>
              <p className="mt-1 text-xs text-current/80">Label + action</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MotionProof() {
  return (
    <div className="space-y-4" data-proof-motion-group>
      <div className="grid gap-3 md:grid-cols-3">
        <article className="group rounded-xl border border-border bg-card p-4 shadow-card" data-proof-motion="fast">
          <p className="text-xs font-medium text-brand-700">
            Respons cepat · 150 ms
          </p>
          <h3 className="mt-2 text-sm font-semibold">Feedback kecil</h3>
          <div className="mt-5 overflow-hidden rounded-full bg-muted p-1">
            <div
              className="h-2 w-1/3 rounded-full bg-brand-500 transition-transform group-hover:translate-x-full"
              style={{
                transitionDuration: "var(--duration-fast-token)",
                transitionTimingFunction: "var(--ease-standard-token)",
              }}
            />
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Hover kartu untuk melihat pergeseran singkat.
          </p>
        </article>

        <article className="group rounded-xl border border-border bg-card p-4 shadow-card" data-proof-motion="standard">
          <p className="text-xs font-medium text-brand-700">
            Gerak standar · 220 ms
          </p>
          <h3 className="mt-2 text-sm font-semibold">Perubahan posisi</h3>
          <button
            className="mt-5 inline-flex rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium transition-transform outline-none group-hover:-translate-y-1 focus-visible:ring-3 focus-visible:ring-ring/50"
            style={{
              transitionDuration: "var(--duration-normal-token)",
              transitionTimingFunction: "var(--ease-emphasis-token)",
            }}
            type="button"
          >
            Hover atau fokus
          </button>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Digunakan saat surface perlu terasa responsif tanpa menjadi dekoratif.
          </p>
        </article>

        <article className="rounded-xl border border-border bg-muted/50 p-4" data-proof-motion="reduced">
          <p className="text-xs font-medium text-brand-700">
            Gerak dikurangi
          </p>
          <h3 className="mt-2 text-sm font-semibold">Tetap dapat dipahami</h3>
          <div className="mt-5 flex items-center gap-2">
            <span className="size-3 rounded-full bg-brand-500" />
            <span className="h-px flex-1 bg-border" />
            <span className="size-3 rounded-full border-2 border-brand-700" />
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Saat reduced motion aktif, informasi tetap tersedia tanpa transisi.
          </p>
        </article>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {motionTokens.map((token) => (
          <div className="rounded-lg border border-border bg-card p-3" key={token.token}>
            <p className="text-sm font-medium">{token.label}</p>
            <code className="mt-1 block truncate text-xs text-muted-foreground">{token.value}</code>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{token.usage}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ContrastProof() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-card">
      <div className="grid gap-3 border-b border-border bg-muted/50 px-4 py-3 text-xs font-medium text-muted-foreground sm:grid-cols-[minmax(0,1fr)_7rem_7rem_5rem]">
        <span>Pasangan</span>
        <span>Teks</span>
        <span>Latar</span>
        <span>Rasio</span>
      </div>
      {contrastTokens.map((token) => (
        <div className="grid items-center gap-3 border-b border-border px-4 py-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_7rem_7rem_5rem]" key={token.label}>
          <span className="text-sm font-medium">{token.label}</span>
          <code className="rounded-md px-2 py-1 text-xs" style={{ backgroundColor: token.foreground, color: token.background }}>
            {token.foreground}
          </code>
          <code className="rounded-md border border-border px-2 py-1 text-xs" style={{ backgroundColor: token.background, color: token.foreground }}>
            {token.background}
          </code>
          <span className="font-mono text-xs font-semibold text-success">{token.ratio}</span>
        </div>
      ))}
    </div>
  );
}

export function VisualProof() {
  return (
    <div className="space-y-10" data-visual-proof>
      <section className="scroll-mt-8 space-y-6" id="surface-proof">
        <div className="space-y-2">
          <p className="text-sm font-medium text-brand-700">
            Visual proof · surface
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Satu identitas, tiga kebutuhan kerja</h2>
          <p className="max-w-3xl leading-7 text-muted-foreground">
            Niuva mempertahankan aksen identitas yang sama, tetapi mengubah surface,
            kepadatan, dan ritme sesuai konteks public, checkout, dan admin.
          </p>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {surfaceProofs.map((proof) => (
            <SurfaceCard key={proof.key} proof={proof} />
          ))}
        </div>
      </section>

      <section className="scroll-mt-8 space-y-6" id="motion-proof">
        <div className="space-y-2">
          <p className="text-sm font-medium text-brand-700">
            Visual proof · motion
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Gerak singkat untuk memberi feedback</h2>
          <p className="max-w-3xl leading-7 text-muted-foreground">
            Motion Niuva hanya membantu pengguna membaca perubahan atau respons.
            Public boleh lebih ekspresif; checkout dan admin tetap tenang serta
            dapat dihentikan oleh reduced-motion preference.
          </p>
        </div>
        <MotionProof />
      </section>

      <section className="scroll-mt-8 space-y-6" id="semantic-proof">
        <div className="space-y-2">
          <p className="text-sm font-medium text-brand-700">
            Visual proof · state
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Status menjelaskan keadaan dan tindakan berikutnya</h2>
          <p className="max-w-3xl leading-7 text-muted-foreground">
            Warna membantu pemindaian, tetapi label, simbol, dan recovery action
            tetap membawa makna utama untuk customer dan operator.
          </p>
        </div>
        <SemanticProof />
      </section>

      <section className="scroll-mt-8 space-y-6" id="contrast-proof">
        <div className="space-y-2">
          <p className="text-sm font-medium text-brand-700">
            Visual proof · accessibility
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Pasangan kontras utama</h2>
          <p className="max-w-3xl leading-7 text-muted-foreground">
            Pasangan ini menjadi baseline kontras foundation untuk body text, link,
            tombol brand, dan dark stage.
          </p>
        </div>
        <ContrastProof />
      </section>
    </div>
  );
}
