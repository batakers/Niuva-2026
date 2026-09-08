"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { FormField } from "@/components/niuva/form-field";
import { StatusNotice } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminQuotePreview } from "@/features/admin/quote-preview";
import {
  calculatePreviewQuote,
  getPreviewQuoteFixture,
  previewActivePricingRule,
  previewFilamentSources,
  type AdminQuoteScenario,
  type PreviewQuoteCalculation,
} from "@/features/admin/quote-preview-data";
import type { FilamentSource } from "@/modules/pricing/calculator";

type SentPreviewSnapshot = Readonly<{
  calculation: PreviewQuoteCalculation;
  expiresAt: string;
  filamentSource: FilamentSource;
  scopeNotes: string;
  sentAt: string;
}>;

type AdminQuoteEditorProps = Readonly<{
  initialScenario: AdminQuoteScenario;
  initialSelectedReference: string | null;
}>;

const quotePreviewPath = "/auis/proofs/frontend/admin?preview=examples&state=ready&module=quotes";
const previewSentAt = "8 September 2026, 10.30 WIB";
const previewExpiresAt = "15 September 2026, 10.30 WIB";

function QuoteLoadingState() {
  return (
    <section aria-busy="true" aria-label="Memuat draft quote preview" className="space-y-4" data-admin-quote-loading>
      <div className="h-8 w-48 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="h-48 animate-pulse rounded-xl border border-border bg-muted motion-reduce:animate-none" />
    </section>
  );
}

function sourceLabel(source: FilamentSource): string {
  return previewFilamentSources.find((item) => item.value === source)?.label ?? source;
}

export function AdminQuoteEditor({
  initialScenario,
  initialSelectedReference,
}: AdminQuoteEditorProps) {
  const hydrated = useHydrated();
  const sentNoticeRef = useRef<HTMLDivElement>(null);
  const fixture = getPreviewQuoteFixture(initialSelectedReference);
  const [scenario, setScenario] = useState<AdminQuoteScenario>(initialScenario);
  const [filamentSource, setFilamentSource] = useState<FilamentSource>("NIUVA_STOCK");
  const [scopeNotes, setScopeNotes] = useState("");
  const [sentSnapshot, setSentSnapshot] = useState<SentPreviewSnapshot | null>(null);

  const calculation = useMemo(() => {
    if (fixture === null || scenario !== "ready") return null;

    return calculatePreviewQuote(filamentSource, fixture);
  }, [filamentSource, fixture, scenario]);

  useEffect(() => {
    if (sentSnapshot !== null) sentNoticeRef.current?.focus();
  }, [sentSnapshot]);

  if (fixture === null) {
    return (
      <main className="mx-auto max-w-admin px-5 py-8 sm:px-8 sm:py-10" data-admin-quote-editor="preview" id="main-content">
        <StatusNotice
          description="Referensi pada query tidak cocok dengan fixture quote. Tidak ada draft, request, atau data server yang dimuat."
          title="Quote preview tidak tersedia"
          tone="warning"
        />
      </main>
    );
  }

  const isSent = sentSnapshot !== null;
  const previewCalculation = sentSnapshot?.calculation ?? calculation;
  const previewSource = sentSnapshot?.filamentSource ?? filamentSource;
  const previewNotes = sentSnapshot?.scopeNotes ?? scopeNotes;
  const previewSentTime = sentSnapshot?.sentAt ?? null;
  const previewExpiry = sentSnapshot?.expiresAt ?? null;

  function sendPreview() {
    if (calculation === null || isSent) return;

    setSentSnapshot({
      calculation,
      expiresAt: previewExpiresAt,
      filamentSource,
      scopeNotes,
      sentAt: previewSentAt,
    });
  }

  return (
    <main
      className="mx-auto max-w-admin px-5 py-8 sm:px-8 sm:py-10"
      data-admin-quote-editor="preview"
      data-quote-scenario={scenario}
      id="main-content"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div className="min-w-0">
          <header className="border-b border-border pb-6">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-brand-700">Target /admin/custom-print/quotes</p>
              <Badge className="border-border bg-background text-muted-foreground" variant="outline">Development-only preview</Badge>
            </div>
            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Draft dari review yang sudah lengkap.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Quote memakai input slicer yang dibekukan. Pilihan browser tidak dapat mengaktifkan rule, membuat token, atau mengirim quote nyata.
            </p>
          </header>

          {scenario === "loading" ? <div className="pt-6"><QuoteLoadingState /></div> : null}

          {scenario === "empty" ? (
            <StatusNotice
              className="mt-6"
              description="Keadaan ini hanya skenario preview. Jangan menyimpulkan antrean quote produksi kosong."
              title="Tidak ada draft quote contoh"
              tone="info"
            />
          ) : null}

          {scenario === "error" ? (
            <StatusNotice
              action={<Button className="min-h-11 cursor-pointer" disabled={!hydrated} onClick={() => setScenario("ready")} type="button" variant="outline">Coba lagi</Button>}
              className="mt-6"
              description="Tidak ada pricing rule, draft, atau data server yang dibaca pada skenario ini. Tombol hanya memulihkan fixture lokal."
              title="Draft quote preview belum dapat dimuat"
              tone="error"
            />
          ) : null}

          {scenario === "rule-missing" ? (
            <StatusNotice
              className="mt-6"
              description="Quote nyata tidak boleh memakai policy fallback. Owner harus mengaktifkan rule yang ditinjau sebelum server membuat draft dan menghitung snapshot."
              title="Pricing rule aktif tidak tersedia"
              tone="warning"
            />
          ) : null}

          {scenario === "ready" || scenario === "rule-missing" ? (
            <section aria-labelledby="quote-draft-heading" className="pt-6">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold" id="quote-draft-heading">Parameter draft</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Hanya sumber filament dan catatan scope yang dapat diubah pada preview. Input review tetap read-only.</p>
                </div>
                <p className="font-mono text-xs font-medium text-brand-700">{fixture.requestReference}</p>
              </div>

              <Card className="mt-5 shadow-card">
                <CardHeader>
                  <CardTitle>Hasil review operator</CardTitle>
                  <CardDescription>Nilai ini diteruskan ke server bersama pricing rule aktif ketika draft nyata dibuat.</CardDescription>
                </CardHeader>
                <CardContent>
                  <dl className="grid gap-4 text-sm sm:grid-cols-2">
                    <div><dt className="text-muted-foreground">Material</dt><dd className="mt-1 font-medium">{fixture.materialCode}</dd></div>
                    <div><dt className="text-muted-foreground">Berat slicer</dt><dd className="mt-1 font-medium">{fixture.verifiedWeightG} g</dd></div>
                    <div><dt className="text-muted-foreground">Durasi cetak</dt><dd className="mt-1 font-medium">{fixture.printDurationSeconds.toLocaleString("id-ID")} detik</dd></div>
                    <div><dt className="text-muted-foreground">Quantity request</dt><dd className="mt-1 font-medium">{fixture.quantity} unit</dd></div>
                    <div className="sm:col-span-2"><dt className="text-muted-foreground">Konfigurasi</dt><dd className="mt-1 leading-6">{fixture.configurationSummary}</dd></div>
                    <div className="sm:col-span-2"><dt className="text-muted-foreground">Catatan review</dt><dd className="mt-1 leading-6">{fixture.reviewNotes}</dd></div>
                  </dl>
                </CardContent>
              </Card>

              <form className="mt-6 space-y-5" onSubmit={(event) => { event.preventDefault(); sendPreview(); }}>
                <FormField
                  description="Policy rate tidak dikirim dari browser. Preview hanya memilih source untuk menghitung fixture dengan rule yang telah didefinisikan."
                  disabled={!hydrated || scenario === "rule-missing" || isSent}
                  id="quote-filament-source"
                  label="Sumber filament untuk quote"
                  required
                >
                  <select
                    className="min-h-11 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50"
                    onChange={(event) => setFilamentSource(event.target.value as FilamentSource)}
                    value={filamentSource}
                  >
                    {previewFilamentSources.map((source) => <option key={source.value} value={source.value}>{source.label}</option>)}
                  </select>
                </FormField>

                <FormField
                  description="Opsional. Catatan ini akan terlihat sebagai bagian snapshot saat preview dikirim."
                  disabled={!hydrated || scenario === "rule-missing" || isSent}
                  id="quote-scope-notes"
                  label="Catatan scope quote"
                >
                  <textarea
                    className="min-h-24 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50"
                    onChange={(event) => setScopeNotes(event.target.value)}
                    placeholder="Contoh: finishing mengikuti hasil review operator."
                    rows={3}
                    value={scopeNotes}
                  />
                </FormField>

                <section aria-labelledby="active-rule-heading" className="rounded-xl border border-border bg-muted/35 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold" id="active-rule-heading">Rule untuk kalkulasi preview</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{scenario === "rule-missing" ? "Tidak ada rule aktif pada fixture." : previewActivePricingRule.label}</p>
                    </div>
                    <Badge className={scenario === "rule-missing" ? "border-warning-border bg-warning-background text-warning" : "border-success-border bg-success-background text-success"} variant="outline">
                      {scenario === "rule-missing" ? "Rule tidak tersedia" : "Rule tervalidasi"}
                    </Badge>
                  </div>
                  {scenario === "ready" ? <p className="mt-3 font-mono text-xs text-muted-foreground">{previewActivePricingRule.ruleCode} v{previewActivePricingRule.version} · quantity {previewActivePricingRule.definition.quantitySemantics}</p> : null}
                </section>

                {isSent ? (
                  <StatusNotice
                    description="Input di atas dikunci dari snapshot lokal. Quote nyata tetap memerlukan create draft, send, audit, token, dan email yang terpisah di server."
                    title="Snapshot preview sudah terkirim dan tidak dapat diubah"
                    tone="success"
                  />
                ) : (
                  <Button className="min-h-11 cursor-pointer" disabled={!hydrated || calculation === null} type="submit">
                    Kirim quote preview
                  </Button>
                )}
              </form>
            </section>
          ) : null}

          {isSent ? <div aria-live="polite" className="sr-only" ref={sentNoticeRef} tabIndex={-1}>Quote preview terkirim dan snapshot dikunci.</div> : null}
          <p className="mt-8 break-all text-xs leading-5 text-muted-foreground">Preview URL: {quotePreviewPath}&amp;quote={fixture.quoteReference}</p>
        </div>

        <AdminQuotePreview
          calculation={previewCalculation}
          expiresAt={previewExpiry}
          filamentSourceLabel={sourceLabel(previewSource)}
          fixture={fixture}
          scopeNotes={previewNotes}
          sentAt={previewSentTime}
          status={isSent ? "SENT" : "DRAFT"}
        />
      </div>
    </main>
  );
}
