"use client";

import { useEffect, useMemo, useState } from "react";

import { FormField } from "@/components/niuva/form-field";
import { StatusNotice } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import {
  createInitialProductEditorValues,
  getProductEditorFixture,
  hasProductEditorChanges,
  isStockAdjustmentReason,
  productEditorFields,
  validateProductEditor,
  type AdminProductEditorScenario,
  type ProductEditorErrors,
  type ProductEditorField,
  type ProductEditorFormValues,
} from "./product-editor-data";
import { StockEditor } from "./stock-editor";

type AdminProductEditorProps = Readonly<{
  initialScenario: AdminProductEditorScenario;
  initialSelectedSku: string | null;
}>;

type PreviewSaveKind = "draft" | "published";

const identityFields = ["name", "slug", "description", "isPublished"] as const satisfies readonly ProductEditorField[];
const variantFields = ["variantName", "sku", "priceRp", "weightGrams", "lengthCm", "widthCm", "heightCm", "isActive"] as const satisfies readonly ProductEditorField[];
const stockFields = ["stockOnHand", "stockReason"] as const satisfies readonly ProductEditorField[];
const editorPreviewPath = "/auis/proofs/frontend/admin?preview=examples&state=ready&module=products&view=editor";
const missingFixtureValues: ProductEditorFormValues = {
  description: "",
  heightCm: "",
  isActive: false,
  isPublished: false,
  lengthCm: "",
  name: "",
  priceRp: "",
  sku: "",
  slug: "",
  stockOnHand: "0",
  stockReason: "",
  variantName: "",
  weightGrams: "",
  widthCm: "",
};

function ProductEditorLoadingState() {
  return (
    <section aria-busy="true" aria-label="Memuat editor produk preview" className="space-y-4" data-admin-product-editor-loading>
      <div className="h-8 w-56 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="h-64 animate-pulse rounded-xl border border-border bg-muted motion-reduce:animate-none" />
      <div className="h-44 animate-pulse rounded-xl border border-border bg-muted motion-reduce:animate-none" />
    </section>
  );
}

function ChangeLedgerRow({
  changed,
  label,
}: Readonly<{
  changed: boolean;
  label: string;
}>) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0">
      <span className="text-sm text-foreground">{label}</span>
      <Badge className={changed ? "border-warning-border bg-warning-background text-warning" : "border-success-border bg-success-background text-success"} variant="outline">
        {changed ? "Draft berubah" : "Sama dengan fixture"}
      </Badge>
    </div>
  );
}

function MediaPreview({
  description,
  status,
}: Readonly<{
  description: string;
  status: string;
}>) {
  return (
    <section aria-labelledby="product-media-heading" className="border-t border-border pt-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold" id="product-media-heading">Media produk</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Status media dipisahkan dari perubahan identitas dan publikasi.</p>
        </div>
        <Badge className="border-warning-border bg-warning-background text-warning" variant="outline">Belum terhubung</Badge>
      </div>
      <div className="mt-5 grid min-h-36 place-items-center border border-dashed border-border bg-muted/35 p-5 text-center">
        <div className="max-w-md">
          <p className="text-sm font-medium text-foreground">{status}</p>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
    </section>
  );
}

export function AdminProductEditor({
  initialScenario,
  initialSelectedSku,
}: AdminProductEditorProps) {
  const hydrated = useHydrated();
  const fixture = getProductEditorFixture(initialSelectedSku);
  const initialValues = fixture === null ? missingFixtureValues : createInitialProductEditorValues(fixture);
  const [scenario, setScenario] = useState<AdminProductEditorScenario>(initialScenario);
  const [baseline, setBaseline] = useState<ProductEditorFormValues>(() => initialValues);
  const [draft, setDraft] = useState<ProductEditorFormValues>(() => initialValues);
  const [errors, setErrors] = useState<ProductEditorErrors>({});
  const [saveKind, setSaveKind] = useState<PreviewSaveKind | null>(null);

  const initialStockOnHand = fixture?.values.stockOnHand ?? "0";
  const identityChanged = useMemo(() => hasProductEditorChanges(draft, baseline, identityFields), [baseline, draft]);
  const variantChanged = useMemo(() => hasProductEditorChanges(draft, baseline, variantFields), [baseline, draft]);
  const stockChanged = useMemo(() => hasProductEditorChanges(draft, baseline, stockFields), [baseline, draft]);
  const isDirty = useMemo(() => hasProductEditorChanges(draft, baseline), [baseline, draft]);

  useEffect(() => {
    const firstError = productEditorFields.find((field) => errors[field] !== undefined);

    if (firstError !== undefined) document.getElementById(`admin-product-${firstError}`)?.focus();
  }, [errors]);

  if (fixture === null) {
    return (
      <main className="mx-auto max-w-admin px-5 py-8 sm:px-8 sm:py-10" data-admin-product-editor="preview" id="main-content">
        <StatusNotice
          description="SKU pada query tidak cocok dengan fixture editor. Tidak ada produk, varian, media, atau stok server yang dimuat."
          title="Produk preview tidak tersedia"
          tone="warning"
        />
      </main>
    );
  }

  const activeFixture = fixture;

  const controlsDisabled = !hydrated || scenario !== "ready";

  function setField<Field extends ProductEditorField>(field: Field, value: ProductEditorFormValues[Field]) {
    setDraft((current) => ({ ...current, [field]: value }));
    setSaveKind(null);
  }

  function validateField(field: ProductEditorField) {
    const nextErrors = validateProductEditor(draft, initialStockOnHand);

    setErrors((current) => ({ ...current, [field]: nextErrors[field] }));
  }

  function resetDraft() {
    const reset = createInitialProductEditorValues(activeFixture);
    setBaseline(reset);
    setDraft(reset);
    setErrors({});
    setSaveKind(null);
  }

  function savePreview(kind: PreviewSaveKind) {
    const nextDraft: ProductEditorFormValues = kind === "published" ? { ...draft, isPublished: true } : draft;
    const nextErrors = validateProductEditor(nextDraft, initialStockOnHand);

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) return;

    setDraft(nextDraft);
    setBaseline(nextDraft);
    setSaveKind(kind);
  }

  return (
    <main
      className="mx-auto max-w-admin px-5 py-8 sm:px-8 sm:py-10"
      data-admin-product-editor="preview"
      data-product-editor-scenario={scenario}
      id="main-content"
    >
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <div className="min-w-0">
          <header className="border-b border-border pb-6">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm font-medium text-brand-700">Target /admin/products/:id</p>
              <Badge className="border-border bg-background text-muted-foreground" variant="outline">Development-only preview</Badge>
              {isDirty ? <Badge className="border-warning-border bg-warning-background text-warning" variant="outline">Perubahan belum disimpan</Badge> : null}
            </div>
            <h1 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Ubah katalog tanpa mengabaikan konteks.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              Identitas, varian, dan stok adalah draft terpisah. Browser tidak dapat mempublikasikan katalog, menyimpan harga, atau mengubah stok nyata.
            </p>
          </header>

          {scenario === "loading" ? <div className="pt-6"><ProductEditorLoadingState /></div> : null}

          {scenario === "empty" ? (
            <StatusNotice
              className="mt-6"
              description="Keadaan ini hanya skenario preview. Jangan menyimpulkan katalog produksi tidak memiliki produk untuk diedit."
              title="Tidak ada produk contoh untuk diedit"
              tone="info"
            />
          ) : null}

          {scenario === "error" ? (
            <StatusNotice
              action={<Button className="min-h-11 cursor-pointer" disabled={!hydrated} onClick={() => setScenario("ready")} type="button" variant="outline">Coba lagi</Button>}
              className="mt-6"
              description="Tidak ada request katalog, media, atau stok yang dilakukan. Tombol hanya mengembalikan editor fixture lokal."
              title="Editor produk preview belum dapat dimuat"
              tone="error"
            />
          ) : null}

          {scenario === "conflict" ? (
            <StatusNotice
              action={<Button className="min-h-11 cursor-pointer" disabled={!hydrated} onClick={() => { resetDraft(); setScenario("ready"); }} type="button" variant="outline">Muat ulang fixture</Button>}
              className="mt-6"
              description="Skenario ini meniru respons konflik tanpa memilih data pemenang. Integrasi nanti perlu memuat ulang record terbaru dan menjaga reservasi stok serta audit di server."
              title="Perubahan preview berbenturan"
              tone="error"
            />
          ) : null}

          {scenario === "ready" ? (
            <form
              className="space-y-8 pt-6"
              onSubmit={(event) => {
                event.preventDefault();
                savePreview("draft");
              }}
            >
              <section aria-labelledby="product-identity-heading">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold" id="product-identity-heading">Identitas produk</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">Field berikut memetakan kontrak product. Kategori fixture hanya dibaca untuk menghindari pemalsuan category ID.</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Kategori contoh: <span className="font-medium text-foreground">{activeFixture.categoryLabel}</span></p>
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <FormField disabled={controlsDisabled} error={errors.name} id="admin-product-name" label="Nama produk" required>
                    <Input className="min-h-11" onBlur={() => validateField("name")} onChange={(event) => setField("name", event.target.value)} value={draft.name} />
                  </FormField>
                  <FormField description="Sama dengan aturan slug backend: huruf kecil, angka, dan tanda hubung." disabled={controlsDisabled} error={errors.slug} id="admin-product-slug" label="Slug" required>
                    <Input className="min-h-11" onBlur={() => validateField("slug")} onChange={(event) => setField("slug", event.target.value)} value={draft.slug} />
                  </FormField>
                  <FormField className="md:col-span-2" disabled={controlsDisabled} error={errors.description} id="admin-product-description" label="Deskripsi produk" required>
                    <textarea className="min-h-28 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50" onBlur={() => validateField("description")} onChange={(event) => setField("description", event.target.value)} rows={4} value={draft.description} />
                  </FormField>
                </div>

                <div className="mt-5 flex min-h-11 items-center justify-between gap-4 rounded-xl border border-border bg-muted/35 p-4">
                  <div>
                    <label className="text-sm font-medium" htmlFor="admin-product-isPublished">Publikasi produk</label>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Preview hanya mengubah indikator lokal. Katalog publik tetap memakai read server-side yang memfilter produk published.</p>
                  </div>
                  <Switch checked={draft.isPublished} disabled={controlsDisabled} id="admin-product-isPublished" onCheckedChange={(checked) => setField("isPublished", checked)} />
                </div>
              </section>

              <MediaPreview description={activeFixture.mediaSummary} status={activeFixture.mediaStatus} />

              <section aria-labelledby="variant-editor-heading" className="border-t border-border pt-6">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold" id="variant-editor-heading">Varian terpilih</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">Harga dan ukuran tetap string Decimal pada draft agar browser tidak menjadi authority perhitungan.</p>
                  </div>
                  <p className="font-mono text-xs font-medium text-brand-700">{activeFixture.values.sku}</p>
                </div>

                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  <FormField disabled={controlsDisabled} error={errors.variantName} id="admin-product-variantName" label="Nama varian" required>
                    <Input className="min-h-11" onBlur={() => validateField("variantName")} onChange={(event) => setField("variantName", event.target.value)} value={draft.variantName} />
                  </FormField>
                  <FormField disabled={controlsDisabled} error={errors.sku} id="admin-product-sku" label="SKU" required>
                    <Input className="min-h-11 font-mono" onBlur={() => validateField("sku")} onChange={(event) => setField("sku", event.target.value)} value={draft.sku} />
                  </FormField>
                  <FormField description="Bilangan Rupiah nonnegatif tanpa pecahan, sesuai contract priceRp." disabled={controlsDisabled} error={errors.priceRp} id="admin-product-priceRp" label="Harga varian (Rp)" required>
                    <Input className="min-h-11" inputMode="numeric" onBlur={() => validateField("priceRp")} onChange={(event) => setField("priceRp", event.target.value)} value={draft.priceRp} />
                  </FormField>
                  <FormField description="Decimal nonnegatif hingga 6 digit pecahan, tanpa konversi Number." disabled={controlsDisabled} error={errors.weightGrams} id="admin-product-weightGrams" label="Berat varian (g)" required>
                    <Input className="min-h-11" inputMode="decimal" onBlur={() => validateField("weightGrams")} onChange={(event) => setField("weightGrams", event.target.value)} value={draft.weightGrams} />
                  </FormField>
                  <FormField description="Opsional. Kosong berarti dimensi tidak diset pada variant." disabled={controlsDisabled} error={errors.lengthCm} id="admin-product-lengthCm" label="Panjang (cm)">
                    <Input className="min-h-11" inputMode="decimal" onBlur={() => validateField("lengthCm")} onChange={(event) => setField("lengthCm", event.target.value)} value={draft.lengthCm} />
                  </FormField>
                  <FormField description="Opsional. Kosong berarti dimensi tidak diset pada variant." disabled={controlsDisabled} error={errors.widthCm} id="admin-product-widthCm" label="Lebar (cm)">
                    <Input className="min-h-11" inputMode="decimal" onBlur={() => validateField("widthCm")} onChange={(event) => setField("widthCm", event.target.value)} value={draft.widthCm} />
                  </FormField>
                  <FormField description="Opsional. Kosong berarti dimensi tidak diset pada variant." disabled={controlsDisabled} error={errors.heightCm} id="admin-product-heightCm" label="Tinggi (cm)">
                    <Input className="min-h-11" inputMode="decimal" onBlur={() => validateField("heightCm")} onChange={(event) => setField("heightCm", event.target.value)} value={draft.heightCm} />
                  </FormField>
                </div>

                <div className="mt-5 flex min-h-11 items-center justify-between gap-4 rounded-xl border border-border bg-muted/35 p-4">
                  <div>
                    <label className="text-sm font-medium" htmlFor="admin-product-isActive">Varian aktif</label>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">Varian inactive tidak boleh terlihat sebagai varian yang dapat dibeli di katalog publik.</p>
                  </div>
                  <Switch checked={draft.isActive} disabled={controlsDisabled} id="admin-product-isActive" onCheckedChange={(checked) => setField("isActive", checked)} />
                </div>
              </section>

              <StockEditor
                disabled={controlsDisabled}
                errors={errors}
                initialStockOnHand={initialStockOnHand}
                onReasonChange={(value) => {
                  const nextReason = isStockAdjustmentReason(value) ? value : "";
                  setField("stockReason", nextReason);
                  setErrors((current) => ({
                    ...current,
                    stockReason: nextReason === "" && draft.stockOnHand !== initialStockOnHand
                      ? "Pilih alasan saat jumlah stok berubah."
                      : undefined,
                  }));
                }}
                onStockBlur={() => validateField("stockOnHand")}
                onStockChange={(value) => setField("stockOnHand", value)}
                reason={draft.stockReason}
                stockOnHand={draft.stockOnHand}
              />

              {saveKind !== null ? (
                <StatusNotice
                  description={saveKind === "published" ? "Indikator publikasi fixture sekarang aktif secara lokal. Tidak ada read katalog publik, write database, atau audit event yang dijalankan." : "Draft fixture telah menjadi baseline baru di browser. Tidak ada database, media, stok, atau katalog publik yang berubah."}
                  title={saveKind === "published" ? "Publikasi preview ditandai secara lokal" : "Perubahan preview tersimpan secara lokal"}
                  tone="success"
                />
              ) : null}

              <div className="flex flex-wrap gap-3 border-t border-border pt-6">
                <Button className="min-h-11 cursor-pointer" disabled={controlsDisabled || !isDirty} type="submit">Simpan perubahan preview</Button>
                <Button className="min-h-11 cursor-pointer" disabled={controlsDisabled || draft.isPublished} onClick={() => savePreview("published")} type="button" variant="outline">Publikasikan preview</Button>
                <Button className="min-h-11 cursor-pointer" disabled={controlsDisabled || !isDirty} onClick={resetDraft} type="button" variant="ghost">Buang perubahan lokal</Button>
              </div>
            </form>
          ) : null}

          <p className="mt-8 break-all text-xs leading-5 text-muted-foreground">Preview URL: {editorPreviewPath}&amp;sku={activeFixture.values.sku}</p>
        </div>

        <aside aria-label="Ringkasan perubahan preview" className="space-y-4 xl:sticky xl:top-5">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Change ledger</CardTitle>
              <CardDescription>Gunakan indikator ini sebelum menyimpan draft lokal.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangeLedgerRow changed={identityChanged} label="Identitas dan publikasi" />
              <ChangeLedgerRow changed={variantChanged} label="Varian dan ukuran" />
              <ChangeLedgerRow changed={stockChanged} label="Stok dan alasan" />
              <div className="pt-4 text-xs leading-5 text-muted-foreground">Media tetap tidak tersedia karena launch dataset dan akses storage tidak dihubungkan ke preview.</div>
            </CardContent>
          </Card>
          <StatusNotice
            description="Saat diintegrasikan, server akan memeriksa sesi AdminProfile aktif, schema, SKU unik, Decimal, reservation aktif, konflik versi, dan audit. Preview tidak menggantikan kontrol ini."
            title="Batas otoritas browser"
            tone="info"
          />
        </aside>
      </div>
    </main>
  );
}
