import type { CSSProperties } from "react";
import type { Metadata } from "next";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

import {
  brandScale,
  neutralScale,
  rhythmTokens,
  semanticTokens,
  shadowTokens,
  typographyTokens,
  type TokenSwatch,
} from "./foundation/tokens";
import { VisualProof } from "./components/visual-proof";
import { P0ComponentShowcase } from "./components/p0-showcase";
import { P1ComponentShowcase } from "./components/p1-showcase";

export const metadata: Metadata = {
  title: "Foundation styleguide · Niuva",
  description: "Approved Niuva UI Foundation and P0/P1 Design System contracts.",
};

function Palette({ title, tokens }: { title: string; tokens: readonly TokenSwatch[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="text-base font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground">50 → 950</span>
      </div>
      <div className="grid grid-cols-11 gap-1 overflow-x-auto pb-2">
        {tokens.map((token) => (
          <div className="min-w-12 space-y-1.5" key={token.token}>
            <div
              aria-label={`${title} ${token.label}`}
              className="aspect-square rounded-md border border-border shadow-card"
              style={{ backgroundColor: `var(${token.token})` }}
            />
            <p className="text-center font-mono text-[0.65rem] text-muted-foreground">
              {token.label}
            </p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {tokens
          .filter((token) => token.status === "locked")
          .map((token) => (
            <span key={token.token}>
              Locked evidence: <code>{token.token}</code> = {token.value}
            </span>
          ))}
      </div>
    </div>
  );
}

function SemanticTokenList() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {semanticTokens.map((token) => (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3" key={token.token}>
          <span
            aria-hidden="true"
            className="size-8 shrink-0 rounded-md border border-border"
            style={{ backgroundColor: `var(${token.token})` }}
          />
          <span className="min-w-0">
            <span className="block truncate text-sm font-medium">{token.label}</span>
            <code className="block truncate text-xs text-muted-foreground">{token.token}</code>
          </span>
        </div>
      ))}
    </div>
  );
}

function TokenValue({ value }: { value: string }) {
  return <code className="font-mono text-xs text-muted-foreground">{value}</code>;
}

export default function StyleguidePage() {
  return (
    <div className="space-y-section">
      <header className="space-y-6" id="review-state">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-brand-700">
            Foundation disetujui · Design System P0/P1
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Visual foundation Niuva
          </h1>
          <p className="max-w-3xl text-lg leading-8 text-muted-foreground">
            Sistem semantik yang terukur untuk pengembangan produk: surface
            presisi, status operasional yang jelas, dan aksen biru yang memberi
            ruang bagi bukti tanpa mengambil alih komunikasi.
          </p>
        </div>
        <Alert>
          <AlertTitle>Status: UI Foundation disetujui — P0/P1 contracts approved</AlertTitle>
          <AlertDescription>
            Visual Proof public, checkout, admin, semantic states, contrast, dan
            motion telah diterima. Delapan kontrak P0/P1 sudah disetujui dan
            implementasinya tersedia sebagai official components untuk review;
            propagasi layar produk tetap menunggu checkpoint Design System.
          </AlertDescription>
        </Alert>
      </header>

      <section className="scroll-mt-8 space-y-6" id="colors">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Foundation / colors
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Identitas dan surface semantik</h2>
          <p className="max-w-3xl leading-7 text-muted-foreground">
            Nilai identitas yang terkunci dan utility scale industrial yang
            diterima dipisahkan agar penggunaan berikutnya tidak menghilangkan
            evidence brand.
          </p>
        </div>
        <div className="grid gap-8 rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
          <Palette title="Niuva brand" tokens={brandScale} />
          <Separator />
          <Palette title="Neutral" tokens={neutralScale} />
          <Separator />
          <SemanticTokenList />
        </div>
      </section>

      <VisualProof />

      <section className="scroll-mt-8 space-y-6" id="typography">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Foundation / typography
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Hierarki typography Niuva</h2>
          <p className="max-w-3xl leading-7 text-muted-foreground">
            Geist Sans menjadi display dan body; Geist Mono dibatasi untuk label
            teknis, metadata, dan status.
          </p>
        </div>
        <div className="grid gap-4 rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
          {typographyTokens.map((token) => (
            <div className="grid gap-2 border-b border-border pb-4 last:border-0 last:pb-0 sm:grid-cols-[10rem_minmax(0,1fr)] sm:items-baseline" key={token.role}>
              <div>
                <p className="text-sm font-medium">{token.role}</p>
                <p className="text-xs text-muted-foreground">{token.usage}</p>
              </div>
              <p className={token.className}>
                Niuva builds from evidence.
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="scroll-mt-8 space-y-6" id="rhythm">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Foundation / rhythm
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Spacing, shape, dan elevation</h2>
          <p className="max-w-3xl leading-7 text-muted-foreground">
            Role semantik yang diterima membuat keputusan layout dapat digunakan
            kembali tanpa menyebarkan nilai visual satu kali ke setiap layar.
          </p>
        </div>
        <div className="grid gap-8 rounded-xl border border-border bg-card p-5 shadow-card sm:p-6 lg:grid-cols-2">
          <div className="space-y-4">
            <h3 className="font-semibold">Spacing and radius roles</h3>
            <div className="space-y-3">
              {rhythmTokens.map((token) => {
                const isRadius = token.token.includes("radius");
                const previewStyle: CSSProperties = isRadius
                  ? { borderRadius: token.value }
                  : { width: token.value };

                return (
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4" key={token.token}>
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{token.label}</p>
                      <p className="truncate text-xs text-muted-foreground">{token.usage}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        aria-hidden="true"
                        className={isRadius ? "size-8 border-2 border-primary bg-brand-100" : "h-2 rounded-full bg-primary"}
                        style={previewStyle}
                      />
                      <TokenValue value={token.value} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold">Shadow roles</h3>
            <div className="space-y-4">
              {shadowTokens.map((token) => (
                <div
                  className="rounded-xl border border-border bg-background p-5"
                  key={token.token}
                  style={{
                    boxShadow: token.token.includes("floating")
                      ? "var(--shadow-floating-token)"
                      : "var(--shadow-card-token)",
                  }}
                >
                  <p className="text-sm font-medium">{token.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{token.usage}</p>
                  <p className="mt-3">
                    <TokenValue value={token.token} />
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="scroll-mt-8 space-y-6" id="components">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Preview / core components
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Primitif operasional</h2>
          <p className="max-w-3xl leading-7 text-muted-foreground">
            Ini adalah primitive shadcn/Base UI yang menjadi bridge resmi. Kontrak
            P0/P1 sudah diturunkan menjadi komponen official sebelum pola turun
            ke produk.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Action controls</CardTitle>
              <CardDescription>Intent utama, sekunder, dan destructive.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button type="button">Diskusikan proyek</Button>
              <Button type="button" variant="outline">Tinjau detail</Button>
              <Button type="button" variant="destructive">Perlu perhatian</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bahasa status</CardTitle>
              <CardDescription>Status ringkas untuk surface public dan admin.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Badge>Siap ditinjau</Badge>
              <Badge variant="secondary">Sedang dikerjakan</Badge>
              <Badge variant="outline">Draft</Badge>
              <Badge variant="destructive">Terblokir</Badge>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Form field</CardTitle>
              <CardDescription>Label, control, focus, dan helper text.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="foundation-example">Referensi proyek</Label>
              <Input
                id="foundation-example"
                readOnly
                suppressHydrationWarning
                value="NIUVA-2026-001"
              />
              <p className="text-xs text-muted-foreground">Gunakan referensi yang mudah dibaca.</p>
            </CardContent>
          </Card>

          <Alert variant="destructive">
              <AlertTitle>Recovery state</AlertTitle>
            <AlertDescription>
              Jelaskan masalah, berikan tindakan pemulihan, dan pertahankan
              konteks pengguna saat workflow operator tidak dapat dilanjutkan.
            </AlertDescription>
          </Alert>
        </div>
      </section>

      <P0ComponentShowcase />
      <P1ComponentShowcase />

      <section className="space-y-6" id="dark-preview">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Theme preview
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Mapping dark mode eksplisit</h2>
        </div>
        <div className="dark rounded-xl border border-border bg-background p-6 text-foreground shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-semibold">Dark tokens are opt-in</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The foundation does not follow OS preference automatically.
              </p>
            </div>
            <Button type="button" variant="outline">Inspect state</Button>
          </div>
        </div>
      </section>

      <section className="scroll-mt-8 space-y-6" id="registry">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">
            Registry
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">Foundation inventory</h2>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-card sm:p-6">
          <p className="text-sm leading-7 text-muted-foreground">
            Source primitive resmi berada di <code>src/components/ui</code>;
            kontrak komponen dan pola khusus Niuva didokumentasikan di
            <code className="break-all">src/app/auis/styleguide/registry/component-contracts.md</code>.
            Implementasi official component P0/P1 sudah tersedia untuk review;
            screen propagation tetap menunggu checkpoint Design System.
          </p>
          <Separator className="my-5" />
          <div className="mb-4 flex flex-wrap gap-2">
            <Badge>Foundation approved</Badge>
            <Badge variant="secondary">P0 contract approved</Badge>
            <Badge variant="secondary">P1 contract approved</Badge>
            <Badge variant="outline">Propagation blocked</Badge>
          </div>
          <div className="flex flex-wrap gap-2" data-contract-status="approved">
            {[
              "alert",
              "badge",
              "button",
              "card",
              "dialog",
              "dropdown-menu",
              "input",
              "label",
              "radio-group",
              "select",
              "separator",
              "switch",
              "tabs",
              "tooltip",
            ].map((component) => (
              <Badge key={component} variant="outline">{component}</Badge>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
