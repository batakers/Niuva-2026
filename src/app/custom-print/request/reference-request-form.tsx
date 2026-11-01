"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";

import { FormField } from "@/components/niuva/form-field";
import { PrivateUploadField } from "@/components/niuva/private-upload-field";
import { StatusNotice } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Button, buttonVariants } from "@/components/ui/button";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Input } from "@/components/ui/input";
import { usePublicSiteInformation } from "@/components/niuva/public-site-information";
import { createPublicWhatsAppHref } from "@/features/public/company-content";
import type { CustomFlowProductOption } from "@/modules/custom-print/product-intake";
import { REFERENCE_PHOTO_MAX_BYTES } from "@/modules/policy/privacy";

const selectClass = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
// `select` always matches :read-only, so only text controls carry the account-field style.
const controlClass = `${selectClass} read-only:border-border read-only:bg-muted/60`;
const stepClass = "rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-7";
const stepTitleClass = "mb-5 flex items-center gap-3 text-xl font-medium tracking-[-0.015em]";

function StepNumber({ value }: { value: number }) {
  return <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-ui font-semibold text-brand-800 tabular-nums">{value}</span>;
}

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

  return <form aria-busy={result === "pending"} aria-label="Form request dari referensi" className="space-y-6" noValidate onSubmit={submit}>
    <div className="rounded-[var(--radius-control)] empty:hidden focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" ref={statusRef} tabIndex={-1}>
      {Object.keys(errors).length > 0 && <div className="rounded-[var(--radius-control)] border border-destructive-border bg-destructive-background p-4 text-ui font-semibold text-destructive" role="alert">Periksa field yang ditandai sebelum mengirim.</div>}
      {result === "pending" && <p className="text-ui text-muted-foreground" role="status">Menyimpan referensi untuk review operator…</p>}
      {result === "success" && referenceNumber && requestId && <StatusNotice
        action={<div className="flex flex-wrap gap-2">
          <NiuvaLink className="min-h-11" href={`/account/make/${requestId}`}>Lihat status dan tambah model di akun</NiuvaLink>
          <a className={buttonVariants({ className: "min-h-11", variant: "outline" })} href={createPublicWhatsAppHref(referenceNumber, siteInformation.phone)} rel="noreferrer">Lanjutkan via WhatsApp</a>
        </div>}
        description={`Nomor referensi Anda ${referenceNumber}, tersimpan di akun. Model 3D bisa ditambahkan ke pengajuan yang sama. Operator meninjau kebutuhan Anda lebih dulu.`}
        title="Referensi masuk ke Niuva"
        tone="success"
      />}
      {result === "error" && <StatusNotice description="Isian Anda tetap ada. Coba lagi setelah koneksi pulih." title="Request belum tersimpan" tone="error" />}
      {!databaseEnabled && <StatusNotice description="Pengajuan referensi belum bisa dikirim saat ini. Tidak ada data yang dikirim." title="Pengiriman belum tersedia" tone="info" />}
    </div>

    <fieldset className="min-w-0 space-y-6" disabled={!databaseEnabled || result === "pending" || result === "success"}>
      <legend className="sr-only">Informasi kebutuhan dan kontak</legend>
      <section aria-labelledby="reference-needs-title" className={stepClass}>
        <h2 className={stepTitleClass} id="reference-needs-title"><StepNumber value={1} />Kebutuhan awal</h2>
        <p className="-mt-2 mb-5 text-ui font-normal leading-[1.55] text-muted-foreground">Jumlah boleh masih perkiraan. Tanda * menandai isian wajib.</p>
        <div className="space-y-5">
          <FormField description="Sebutkan fungsi, ukuran perkiraan, contoh benda, atau keputusan yang masih perlu bantuan." error={errors.notes} id="reference-notes" label="Apa yang ingin dibuat?" required>
            <textarea className={controlClass} name="notes" required rows={5} />
          </FormField>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField error={errors.quantity} id="reference-quantity" label="Perkiraan jumlah" required>
              <Input className={controlClass} min={1} name="quantity" required type="number" />
            </FormField>
            <FormField error={errors.materialRequested} id="reference-materialRequested" label="Material awal" required>
              <select className={selectClass} defaultValue="" name="materialRequested" required>
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
            {productOptions.length > 0 ? <FormField className="sm:col-span-2" id="reference-productInterest" label="Produk referensi (opsional)">
              <select className={selectClass} defaultValue={initialProductInterest ?? "CUSTOM_UNSPECIFIED"} name="productInterest">
                <option value="CUSTOM_UNSPECIFIED">Kebutuhan custom lain / belum menentukan</option>
                {productOptions.map((product) => <option key={product.sourceProductId} value={product.sourceProductId}>{product.name}</option>)}
              </select>
            </FormField> : <input name="productInterest" type="hidden" value="CUSTOM_UNSPECIFIED" />}
            <FormField className="sm:col-span-2" description="Link HTTPS, opsional. Isi link tidak dibuka otomatis; operator yang memeriksanya." error={errors.referenceLink} id="reference-referenceLink" label="Link sketsa atau referensi (opsional)">
              <Input className={controlClass} name="referenceLink" type="url" />
            </FormField>
          </div>
          {uploadsEnabled ? <PrivateUploadField
            acceptedExtensions={[".jpg", ".jpeg", ".png"]}
            description="Satu foto referensi, opsional, disimpan privat. Maksimum 10 MiB."
            id="reference-photo"
            label="Foto atau sketsa (opsional)"
            maxBytes={REFERENCE_PHOTO_MAX_BYTES}
            onBusyChange={setPhotoBusy}
            onFileChange={(fileId) => setPhotoFileId(fileId)}
          /> : <StatusNotice description="Foto belum bisa diunggah saat ini. Deskripsi dan link HTTPS tetap bisa dikirim." title="Lampiran privat belum aktif" tone="info" />}
        </div>
      </section>

      <section aria-labelledby="reference-contact-title" className={stepClass}>
        <h2 className={stepTitleClass} id="reference-contact-title"><StepNumber value={2} />Kontak untuk review</h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField error={errors.customerName} id="reference-customerName" label="Nama" required><Input autoComplete="name" className={controlClass} name="customerName" required /></FormField>
          <FormField error={errors.customerEmail} id="reference-customerEmail" label="Email akun" required><Input autoComplete="email" className={controlClass} defaultValue={customerEmail} name="customerEmail" readOnly={customerEmail !== undefined} required type="email" /></FormField>
          <FormField className="sm:col-span-2" description="Dipakai operator untuk membahas kebutuhan Anda." error={errors.customerPhone} id="reference-customerPhone" label="Nomor WhatsApp" required><Input autoComplete="tel" className={controlClass} name="customerPhone" required type="tel" /></FormField>
        </div>
        <div className="mt-6 border-t border-border pt-5">
          <FormField description="Saya berhak membagikan deskripsi, link, atau foto ini untuk pemeriksaan oleh Niuva." error={errors.rightsAck} id="reference-rightsAck" label="Persetujuan pemrosesan" required>
            <input className="size-5 accent-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" name="rightsAck" required type="checkbox" />
          </FormField>
        </div>
      </section>
    </fieldset>

    <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
      <Button className="min-h-11 w-full sm:w-auto" disabled={!hydrated || !databaseEnabled || photoBusy || result === "pending" || result === "success"} size="lg" type="submit">
        {result === "pending" ? "Mengirim request…" : "Ajukan referensi untuk review"}
      </Button>
      <p className="text-ui font-normal text-muted-foreground">Mengajukan belum membuat pesanan atau pembayaran.</p>
    </div>
  </form>;
}
