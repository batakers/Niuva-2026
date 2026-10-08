"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";

import { FormField } from "@/components/niuva/form-field";
import { PrivateUploadField } from "@/components/niuva/private-upload-field";
import { StatusNotice } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePublicSiteInformation } from "@/components/niuva/public-site-information";
import { createPublicWhatsAppHref } from "@/features/public/company-content";
import type { CustomFlowProductOption } from "@/modules/custom-print/product-intake";
import { REFERENCE_PHOTO_MAX_BYTES } from "@/modules/policy/privacy";

const controlClass = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

const optionalText = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().trim().min(1).optional(),
);
const referenceFieldsSchema = z.object({
  customerEmail: z.email(),
  customerName: z.string().trim().min(1),
  customerPhone: z.string().trim().min(1),
  materialRequested: z.string().trim().min(1),
  notes: z.string().trim().min(1),
  productInterest: z.string().trim().min(1),
  quantity: z.coerce.number().int().positive(),
  referenceLink: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.url({ protocol: /^https$/ }).optional(),
  ),
  requestedSize: optionalText,
  targetDeadline: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.iso.date().optional(),
  ),
});
const responseSchema = z.object({ requestId: z.uuid(), referenceNumber: z.string().min(1) });
type FieldName = keyof z.infer<typeof referenceFieldsSchema> | "rightsAck";

export function ReferenceRequestForm({
  customerEmail,
  databaseEnabled,
  initialProductInterest,
  productOptions,
  uploadsEnabled,
}: Readonly<{
  customerEmail?: string;
  databaseEnabled: boolean;
  initialProductInterest?: string;
  productOptions: readonly CustomFlowProductOption[];
  uploadsEnabled: boolean;
}>) {
  const siteInformation = usePublicSiteInformation();
  const hydrated = useHydrated();
  const [photoFileId, setPhotoFileId] = useState<string>();
  const [photoBusy, setPhotoBusy] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [result, setResult] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [referenceNumber, setReferenceNumber] = useState<string>();
  const [requestId, setRequestId] = useState<string>();
  const statusRef = useRef<HTMLDivElement>(null);
  const pending = useRef(false);

  useEffect(() => {
    if (Object.keys(errors).length > 0 || result === "success" || result === "error") statusRef.current?.focus();
  }, [errors, result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || photoBusy || !databaseEnabled) return;
    const formData = new FormData(event.currentTarget);
    const parsed = referenceFieldsSchema.safeParse({
      ...Object.fromEntries(formData),
      quantity: Number(formData.get("quantity")),
    });
    const nextErrors: Partial<Record<FieldName, string>> = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = String(issue.path[0]) as FieldName;
        nextErrors[field] = field === "referenceLink"
          ? "Gunakan link HTTPS yang valid."
          : field === "quantity"
            ? "Isi perkiraan jumlah berupa bilangan bulat lebih dari nol."
            : "Lengkapi atau periksa isian ini.";
      }
    }
    if (formData.get("rightsAck") !== "on") {
      nextErrors.rightsAck = "Persetujuan diperlukan sebelum mengirim.";
    }
    setErrors(nextErrors);
    setResult("idle");
    if (!parsed.success || Object.keys(nextErrors).length > 0) return;

    pending.current = true;
    setResult("pending");
    try {
      const response = await fetch("/api/custom-print/requests", {
        body: JSON.stringify({
          ...parsed.data,
          fileIds: photoFileId === undefined ? [] : [photoFileId],
          intakeMode: "REFERENCE_ONLY",
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok) throw new Error("Request belum tersimpan. Periksa isian lalu coba lagi.");
      const saved = responseSchema.parse(await response.json());
      setReferenceNumber(saved.referenceNumber);
      setRequestId(saved.requestId);
      setResult("success");
    } catch {
      setResult("error");
    } finally {
      pending.current = false;
    }
  }

  return <form aria-busy={result === "pending"} aria-label="Form request dari referensi" className="rounded-xl border border-border bg-card p-5 sm:p-8" noValidate onSubmit={submit}>
    <div className="border-b border-border pb-6">
      <h2 className="text-xl font-semibold">Mulai dari referensi yang tersedia.</h2>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">Belum perlu model 3D. Ceritakan apa yang ingin dibuat; operator menentukan langkah menuju model siap review. Jumlah masih berupa perkiraan.</p>
    </div>

    <div className="my-6 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" ref={statusRef} tabIndex={-1}>
      {Object.keys(errors).length > 0 && <div className="rounded-lg border border-destructive-border bg-destructive-background p-4 text-destructive" role="alert">Periksa field yang ditandai sebelum mengirim.</div>}
      {result === "pending" && <p className="text-sm text-muted-foreground" role="status">Menyimpan referensi untuk review operator…</p>}
      {result === "success" && referenceNumber && requestId && <StatusNotice
        action={<div className="flex flex-wrap gap-3">
          <Link className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={`/account/make/${requestId}`}>Lihat status dan tambah model di akun</Link>
          <a className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" href={createPublicWhatsAppHref(referenceNumber, siteInformation.phone)} rel="noreferrer">Lanjutkan via WhatsApp</a>
        </div>}
        description={`Referensi ${referenceNumber} tersimpan di akun Anda. Model dapat ditambahkan pada request yang sama. Operator akan meninjau konteks lebih dahulu.`}
        title="Referensi masuk ke Niuva"
        tone="success"
      />}
      {result === "error" && <StatusNotice description="Isian tetap tersedia. Coba lagi setelah koneksi pulih." title="Request belum tersimpan" tone="error" />}
      {!databaseEnabled && <StatusNotice description="Database belum tersedia pada runtime ini. Tidak ada referensi atau foto yang dikirim." title="Pengiriman belum tersedia" tone="info" />}
    </div>

    <fieldset className="space-y-8" disabled={!databaseEnabled || result === "pending" || result === "success"}>
      <legend className="sr-only">Informasi kebutuhan dan kontak</legend>
      <section className="space-y-5">
        <h3 className="border-b border-border pb-3 text-base font-semibold">Kebutuhan awal</h3>
        <FormField description="Sebutkan fungsi, ukuran perkiraan, contoh benda, atau keputusan yang masih perlu bantuan." error={errors.notes} id="reference-notes" label="Apa yang ingin dibuat?" required>
          <textarea className={controlClass} name="notes" required rows={5} />
        </FormField>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField error={errors.quantity} id="reference-quantity" label="Perkiraan jumlah" required>
            <Input className={controlClass} min={1} name="quantity" required type="number" />
          </FormField>
          <FormField error={errors.materialRequested} id="reference-materialRequested" label="Material awal" required>
            <select className={controlClass} defaultValue="" name="materialRequested" required>
              <option value="">Pilih atau minta rekomendasi</option>
              <option value="PLA">PLA</option><option value="ABS">ABS</option>
              <option value="OWN_FILAMENT">Membawa filament sendiri</option>
              <option value="NEEDS_RECOMMENDATION">Perlu rekomendasi operator</option>
            </select>
          </FormField>
          <FormField error={errors.requestedSize} id="reference-requestedSize" label="Ukuran perkiraan (opsional)">
            <Input className={controlClass} name="requestedSize" placeholder="Contoh: sekitar 8 cm" />
          </FormField>
          <FormField error={errors.targetDeadline} id="reference-targetDeadline" label="Target diperlukan (opsional)">
            <Input className={controlClass} name="targetDeadline" type="date" />
          </FormField>
          <FormField className="sm:col-span-2" id="reference-productInterest" label="Produk referensi (opsional)">
            <select className={controlClass} defaultValue={initialProductInterest ?? "CUSTOM_UNSPECIFIED"} name="productInterest">
              <option value="CUSTOM_UNSPECIFIED">Kebutuhan custom lain / belum menentukan</option>
              {productOptions.map((product) => <option key={product.sourceProductId} value={product.sourceProductId}>{product.name}</option>)}
            </select>
          </FormField>
          <FormField className="sm:col-span-2" description="Link HTTPS opsional. Server tidak mengambil isi link secara otomatis." error={errors.referenceLink} id="reference-referenceLink" label="Link sketsa atau referensi (opsional)">
            <Input className={controlClass} name="referenceLink" type="url" />
          </FormField>
        </div>
        {uploadsEnabled ? <PrivateUploadField
          acceptedExtensions={[".jpg", ".jpeg", ".png"]}
          description="Satu foto referensi opsional, disimpan privat. Maksimum 10 MiB."
          id="reference-photo"
          label="Foto atau sketsa (opsional)"
          maxBytes={REFERENCE_PHOTO_MAX_BYTES}
          onBusyChange={setPhotoBusy}
          onFileChange={(fileId) => setPhotoFileId(fileId)}
        /> : <StatusNotice description="Upload foto belum tersedia. Deskripsi dan link HTTPS tetap dapat dikirim." title="Lampiran privat belum aktif" tone="info" />}
      </section>

      <section className="space-y-5">
        <h3 className="border-b border-border pb-3 text-base font-semibold">Kontak untuk review</h3>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField error={errors.customerName} id="reference-customerName" label="Nama" required><Input autoComplete="name" className={controlClass} name="customerName" required /></FormField>
          <FormField error={errors.customerEmail} id="reference-customerEmail" label="Email akun Google" required><Input autoComplete="email" className={controlClass} defaultValue={customerEmail} name="customerEmail" readOnly={customerEmail !== undefined} required type="email" /></FormField>
          <FormField className="sm:col-span-2" error={errors.customerPhone} id="reference-customerPhone" label="Nomor WhatsApp" required><Input autoComplete="tel" className={controlClass} name="customerPhone" required type="tel" /></FormField>
        </div>
        <FormField description="Saya berhak membagikan deskripsi, link, atau foto ini untuk pemeriksaan oleh Niuva." error={errors.rightsAck} id="reference-rightsAck" label="Persetujuan pemrosesan" required>
          <input className="size-5 accent-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" name="rightsAck" required type="checkbox" />
        </FormField>
      </section>
    </fieldset>
    <div className="mt-8 border-t border-border pt-6">
      <Button className="min-h-11 w-full sm:w-auto" disabled={!hydrated || !databaseEnabled || photoBusy || result === "pending" || result === "success"} type="submit">
        {result === "pending" ? "Mengirim request…" : "Ajukan referensi untuk review"}
      </Button>
    </div>
  </form>;
}
