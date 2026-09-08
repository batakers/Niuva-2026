"use client";

import { useMemo, useState } from "react";

import { FormField } from "@/components/niuva/form-field";
import { StatusNotice } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import { PortfolioMediaEditor, type PortfolioMediaDraft } from "./portfolio-media-editor";

export type AdminPortfolioEditorScenario = "ready" | "loading" | "empty" | "error";

type PortfolioDraft = Readonly<{
  challenge: string;
  process: string;
  result: string;
  serviceLabel: string;
  slug: string;
  summary: string;
  title: string;
}>;

const initialDraft: PortfolioDraft = {
  title: "Fixture internal: sistem penyimpanan modular",
  slug: "fixture-sistem-penyimpanan-modular",
  serviceLabel: "Pengembangan produk",
  summary: "Ringkasan contoh untuk memeriksa struktur narasi sebelum data faktual tersedia.",
  challenge: "Tantangan contoh belum merupakan pernyataan hasil client.",
  process: "Proses contoh belum menyatakan pekerjaan atau hasil Niuva yang dipublikasikan.",
  result: "Hasil wajib menunggu bukti dan izin sebelum dapat dipakai secara publik.",
};

const initialMedia: readonly PortfolioMediaDraft[] = [
  { id: "media-concept", label: "Placeholder media konsep", altText: "Placeholder media konsep untuk review alt text." },
  { id: "media-process", label: "Placeholder media proses", altText: "Placeholder media proses untuk review alt text." },
];

type AdminPortfolioEditorProps = Readonly<{
  initialScenario: AdminPortfolioEditorScenario;
  initialSelectedProject: string | null;
}>;

function validateDraft(draft: PortfolioDraft, media: readonly PortfolioMediaDraft[]) {
  const errors: Partial<Record<keyof PortfolioDraft | "media", string>> = {};
  if (draft.title.trim().length < 3) errors.title = "Judul minimal tiga karakter.";
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug)) errors.slug = "Slug memakai huruf kecil, angka, dan tanda hubung.";
  if (draft.summary.trim().length < 12) errors.summary = "Ringkasan perlu cukup konteks untuk ditinjau.";
  if (draft.challenge.trim().length < 12 || draft.process.trim().length < 12 || draft.result.trim().length < 12) errors.media = "Lengkapi narasi challenge, process, dan result sebelum menyimpan preview.";
  if (media.some((item) => item.altText.trim().length < 8)) errors.media = "Setiap media fixture memerlukan alt text minimal delapan karakter.";
  return errors;
}

function EditorLoadingState() {
  return <section aria-busy="true" aria-label="Memuat editor portofolio preview" className="space-y-4" data-admin-portfolio-editor-loading><div className="h-8 w-56 animate-pulse rounded bg-muted motion-reduce:animate-none" /><div className="h-64 animate-pulse rounded-xl border border-border bg-muted motion-reduce:animate-none" /></section>;
}

export function AdminPortfolioEditor({ initialScenario, initialSelectedProject }: AdminPortfolioEditorProps) {
  const hydrated = useHydrated();
  const [scenario, setScenario] = useState<AdminPortfolioEditorScenario>(initialScenario);
  const [draft, setDraft] = useState<PortfolioDraft>(initialDraft);
  const [media, setMedia] = useState<readonly PortfolioMediaDraft[]>(initialMedia);
  const [permissions, setPermissions] = useState({ clientName: false, clientLogo: false, factualResult: false });
  const [errors, setErrors] = useState<Partial<Record<keyof PortfolioDraft | "media", string>>>({});
  const [saved, setSaved] = useState(false);
  const [publicationIntent, setPublicationIntent] = useState(false);

  const permissionComplete = permissions.clientName && permissions.clientLogo && permissions.factualResult;
  const controlsDisabled = !hydrated || scenario !== "ready";
  const selectedLabel = initialSelectedProject === "new" ? "Draft baru preview" : "Pilihan portofolio preview";
  const mediaReady = useMemo(() => media.every((item) => item.altText.trim().length >= 8), [media]);

  function setField<K extends keyof PortfolioDraft>(key: K, value: PortfolioDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setSaved(false);
  }

  function saveDraft() {
    const nextErrors = validateDraft(draft, media);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setSaved(true);
  }

  function moveMedia(id: string, direction: "up" | "down") {
    setMedia((current) => {
      const index = current.findIndex((item) => item.id === id);
      const target = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setSaved(false);
  }

  return (
    <main className="mx-auto max-w-admin px-5 py-8 sm:px-8 sm:py-10" data-admin-portfolio-editor="preview" data-portfolio-editor-scenario={scenario} id="main-content">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="min-w-0">
          <header className="border-b border-border pb-6">
            <div className="flex flex-wrap items-center gap-3"><p className="text-sm font-medium text-brand-700">Target /admin/portfolio/:id</p><Badge className="border-border bg-background text-muted-foreground" variant="outline">Development-only preview</Badge>{saved ? <Badge className="border-success-border bg-success-background text-success" variant="outline">Draft lokal tersimpan</Badge> : null}</div>
            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Bukti portofolio sebelum publikasi.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Narasi, urutan media, alt text, dan izin ditinjau bersama. Browser tidak dapat membuat project publik atau mengonfirmasi izin nyata.</p>
          </header>
          {scenario === "loading" ? <div className="pt-6"><EditorLoadingState /></div> : null}
          {scenario === "empty" ? <StatusNotice className="mt-6" description="Keadaan ini hanya skenario preview. Tidak ada portfolio produksi yang disimpulkan kosong." title="Tidak ada portofolio contoh untuk diedit" tone="info" /> : null}
          {scenario === "error" ? <StatusNotice action={<Button className="min-h-11 cursor-pointer" disabled={!hydrated} onClick={() => setScenario("ready")} type="button" variant="outline">Coba lagi</Button>} className="mt-6" description="Tidak ada project, media, atau izin server yang dibaca. Tombol hanya memulihkan fixture lokal." title="Editor portofolio preview belum dapat dimuat" tone="error" /> : null}
          {scenario === "ready" ? <form className="space-y-8 pt-6" onSubmit={(event) => { event.preventDefault(); saveDraft(); }}>
            <section aria-labelledby="portfolio-narrative-heading"><h2 className="text-lg font-semibold" id="portfolio-narrative-heading">Narasi project</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{selectedLabel}. Seluruh isi di bawah adalah fixture review, bukan case study faktual.</p><div className="mt-5 grid gap-5 md:grid-cols-2">
              <FormField disabled={controlsDisabled} error={errors.title} id="portfolio-title" label="Judul" required><Input className="min-h-11" onChange={(event) => setField("title", event.target.value)} value={draft.title} /></FormField>
              <FormField disabled={controlsDisabled} error={errors.slug} id="portfolio-slug" label="Slug" required><Input className="min-h-11" onChange={(event) => setField("slug", event.target.value)} value={draft.slug} /></FormField>
              <FormField disabled={controlsDisabled} id="portfolio-service" label="Label layanan" required><Input className="min-h-11" onChange={(event) => setField("serviceLabel", event.target.value)} value={draft.serviceLabel} /></FormField>
              <FormField className="md:col-span-2" disabled={controlsDisabled} error={errors.summary} id="portfolio-summary" label="Ringkasan" required><textarea className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50" onChange={(event) => setField("summary", event.target.value)} value={draft.summary} /></FormField>
              {(["challenge", "process", "result"] as const).map((field) => <FormField className={field === "result" ? "md:col-span-2" : undefined} disabled={controlsDisabled} error={field === "result" ? errors.media : undefined} id={`portfolio-${field}`} key={field} label={field === "challenge" ? "Challenge" : field === "process" ? "Process" : "Result"} required><textarea className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50" onChange={(event) => setField(field, event.target.value)} value={draft[field]} /></FormField>)}
            </div></section>
            <PortfolioMediaEditor disabled={controlsDisabled} media={media} onAltTextChange={(id, value) => { setMedia((current) => current.map((item) => item.id === id ? { ...item, altText: value } : item)); setSaved(false); }} onMove={moveMedia} />
            <section aria-labelledby="portfolio-permission-heading" className="border-t border-border pt-6"><h2 className="text-lg font-semibold" id="portfolio-permission-heading">Checklist izin publikasi</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Konfirmasi hanya menguji gate UI. Ia bukan bukti kontraktual atau persetujuan client.</p><div className="mt-5 space-y-3">{([{ key: "clientName", label: "Izin penggunaan nama client telah diverifikasi" }, { key: "clientLogo", label: "Izin penggunaan logo client telah diverifikasi" }, { key: "factualResult", label: "Bukti hasil faktual telah diverifikasi" }] as const).map((item) => <div className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-border bg-muted/25 p-4" key={item.key}><label className="text-sm font-medium" htmlFor={`portfolio-permission-${item.key}`}>{item.label}</label><Switch checked={permissions[item.key]} disabled={controlsDisabled} id={`portfolio-permission-${item.key}`} onCheckedChange={(checked) => { setPermissions((current) => ({ ...current, [item.key]: checked })); setPublicationIntent(false); }} /></div>)}</div>
              {!permissionComplete ? <StatusNotice className="mt-5" description="Semua tiga konfirmasi fixture diperlukan sebelum intent publikasi dapat diuji. Project publik tetap hanya boleh dibuat server setelah verifikasi izin nyata." title="Publikasi preview diblokir oleh izin" tone="warning" /> : null}
              {publicationIntent ? <StatusNotice className="mt-5" description="Checklist lengkap hanya membuka indikator fixture. Tidak ada nama client, logo, project, media, atau status publik yang diubah." title="Intent publikasi preview dicatat lokal" tone="success" /> : null}
            </section>
            <div className="flex flex-wrap gap-3 border-t border-border pt-6"><Button className="min-h-11 cursor-pointer" disabled={controlsDisabled} type="submit">Simpan draft preview</Button><Button className="min-h-11 cursor-pointer" disabled={controlsDisabled || !permissionComplete || !mediaReady} onClick={() => setPublicationIntent(true)} type="button" variant="outline">Uji intent publikasi</Button></div>
          </form> : null}
        </div>
        <aside aria-label="Batas editor portofolio" className="space-y-4 xl:sticky xl:top-5"><Card className="shadow-card"><CardHeader><CardTitle>Gate sebelum publikasi</CardTitle><CardDescription>Semua kondisi perlu dipenuhi pada integrasi server.</CardDescription></CardHeader><CardContent className="space-y-3 text-sm leading-6 text-muted-foreground"><p>Narasi dan alt text: <span className="font-medium text-foreground">{mediaReady ? "siap ditinjau" : "belum lengkap"}</span></p><p>Izin fixture: <span className="font-medium text-foreground">{permissionComplete ? "lengkap" : "belum lengkap"}</span></p><p>Server tetap menentukan authorization, persistence, publication, dan audit.</p></CardContent></Card><StatusNotice description="Tidak ada client name, logo, media, atau hasil bisnis nyata dalam preview ini." title="Batas evidence" tone="info" /></aside>
      </div>
    </main>
  );
}
