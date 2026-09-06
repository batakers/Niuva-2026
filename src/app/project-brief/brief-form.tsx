"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { b2bInquiryInputSchema } from "@/modules/inquiry/schema";
import { FormField } from "@/components/niuva/form-field";
import { FileUploadField } from "@/components/niuva/file-upload-field";
import { StatusNotice } from "@/components/niuva/status-notice";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { briefFieldGroups } from "./brief-fields";

const controlClass = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
type Result = "idle" | "pending" | "success" | "error" | "unavailable";

export function BriefForm({ previewEnabled = false }: { previewEnabled?: boolean }) {
  const hydrated = useHydrated();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Result>("idle");
  const [scenario, setScenario] = useState<"success" | "error">("success");
  const statusRef = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (Object.keys(errors).length || ["success", "error", "unavailable"].includes(result)) statusRef.current?.focus();
  }, [errors, result]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const formData = new FormData(event.currentTarget);
    const parsed = b2bInquiryInputSchema.safeParse({
      ...Object.fromEntries(formData), confidentialityAck: formData.get("confidentialityAck") === "on",
    });
    setResult("idle");
    if (!parsed.success) {
      const fields: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const name = issue.path[0] === "attachmentFileIds" ? "referenceLink" : String(issue.path[0]);
        fields[name] = name === "confidentialityAck" ? "Persetujuan diperlukan sebelum melanjutkan."
          : name === "email" ? "Masukkan alamat email yang valid."
          : name === "referenceLink" ? "Masukkan link referensi yang valid, termasuk https://."
          : name === "targetDeadline" ? "Pilih tanggal target yang valid."
          : "Lengkapi informasi ini sebelum melanjutkan.";
      }
      // Zod can stop before the reference cross-field refinement when consent
      // is invalid. Show both actionable omissions in the same form pass.
      if (!String(formData.get("referenceLink") ?? "").trim()) {
        fields.referenceLink = "Masukkan link referensi yang valid, termasuk https://.";
      }
      setErrors(fields);
      return;
    }
    setErrors({});
    if (!previewEnabled) { setResult("unavailable"); return; }
    pending.current = true;
    setResult("pending");
    timer.current = setTimeout(() => {
      pending.current = false;
      setResult(scenario);
    }, 600);
  }

  return (
    <form noValidate onSubmit={submit} className="rounded-xl border border-border bg-card p-5 shadow-floating sm:p-8"
      data-project-brief-form aria-label="Form project brief" aria-busy={result === "pending"}>
      <div className="mb-8 border-b border-border pb-6">
        <h2 className="text-xl font-semibold">Mulai dari informasi yang sudah tersedia.</h2>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Tanda * menunjukkan field wajib. Perusahaan, anggaran, dan pilihan layanan boleh dikosongkan.</p>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">Form ini belum mengirim data ke Niuva. Informasi hanya berada di halaman ini dan tidak disimpan setelah Anda meninggalkannya.</p>
      </div>
      {previewEnabled && <div className="mb-8 rounded-lg border border-info-border bg-info-background p-4 text-info">
        <p className="text-sm font-semibold">Preview lokal · gunakan informasi contoh</p>
        <label htmlFor="brief-scenario" className="mb-2 mt-3 block text-sm">Hasil simulasi</label>
        <select id="brief-scenario" className={controlClass} value={scenario} disabled={result === "pending"}
          onChange={event => { setScenario(event.target.value === "error" ? "error" : "success"); setResult("idle"); }}>
          <option value="success">Berhasil (simulasi)</option><option value="error">Gagal (simulasi)</option>
        </select>
      </div>}
      <div ref={statusRef} tabIndex={-1} className="mb-6 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
        {Object.keys(errors).length > 0 && <div role="alert" className="rounded-lg border border-destructive-border bg-destructive-background p-4 text-destructive">
          <p className="font-semibold">Periksa kembali brief Anda.</p>
          <ul className="mt-2 list-inside list-disc text-sm">{Object.entries(errors).map(([name, message]) => <li key={name}>
            <a href={`#brief-${name}`} onClick={event => { event.preventDefault(); document.getElementById(`brief-${name}`)?.focus(); }} className="underline underline-offset-4">
              {briefFieldGroups.flatMap(group => group.fields).find(field => field.name === name)?.label ?? "Persetujuan kerahasiaan"}: {message}
            </a>
          </li>)}</ul>
        </div>}
        {result === "pending" && <p role="status" className="text-sm text-muted-foreground">Menjalankan simulasi… Data tidak dikirim.</p>}
        {result === "success" && <StatusNotice tone="success" title="Simulasi brief berhasil." description="Informasi lolos validasi. Ini hanya preview; belum ada inquiry, nomor referensi, atau pesan yang dikirim ke Niuva." />}
        {result === "error" && <StatusNotice tone="error" title="Simulasi pengiriman gagal." description="Isian tetap tersedia. Pilih skenario berhasil lalu coba kembali untuk meninjau alur pemulihan." />}
        {result === "unavailable" && <StatusNotice tone="info" title="Brief sudah lengkap, pengiriman belum tersedia." description="Belum ada data yang dikirim atau disimpan. Jangan tutup halaman jika Anda masih memerlukan isian ini." />}
      </div>
      <fieldset disabled={result === "pending"} className="min-w-0 space-y-8">
        <legend className="sr-only">Informasi project brief</legend>
        {briefFieldGroups.map(group => <section key={group.title} className="space-y-5">
          <h3 className="border-b border-border pb-3 text-base font-semibold">{group.title}</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            {group.fields.map(field => <FormField key={field.name} id={`brief-${field.name}`} label={field.label}
              required={field.required} description={field.description} error={errors[field.name]}
              className={["description", "projectGoal", "referenceLink"].includes(field.name) ? "sm:col-span-2" : undefined}>
              {field.type === "select" ? <select name={field.name} required={field.required} defaultValue="" className={controlClass}>
                <option value="">{field.required ? "Pilih tahap" : "Belum ditentukan"}</option>
                {field.options?.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select> : field.type === "textarea" ? <textarea name={field.name} required={field.required} rows={4} className={controlClass} /> :
                <Input name={field.name} required={field.required} type={field.type ?? "text"} autoComplete={field.autoComplete} className={controlClass} />}
            </FormField>)}
          </div>
        </section>)}
        <FileUploadField label="Lampiran referensi — belum tersedia" acceptedExtensions={[".stl", ".3mf", ".obj", ".step", ".stp"]}
          maxSizeLabel="100 MiB" description="Penyimpanan privat belum terhubung. Gunakan link referensi di atas; tidak ada file yang diunggah dari halaman ini." disabled />
        <FormField id="brief-confidentialityAck" label="Persetujuan kerahasiaan" required error={errors.confidentialityAck}
          description="Saya berhak membagikan referensi ini untuk peninjauan kebutuhan proyek oleh Niuva.">
          <input type="checkbox" name="confidentialityAck" required className="size-5 accent-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" />
        </FormField>
      </fieldset>
      <div className="mt-8 border-t border-border pt-6">
        <Button type="submit" size="lg" disabled={!hydrated || result === "pending"} className="min-h-11 w-full sm:w-auto">
          {result === "pending" ? "Memproses simulasi…" : previewEnabled ? "Uji brief (simulasi)" : "Periksa kelengkapan brief"}
        </Button>
        <noscript><p className="mt-3 text-sm">Aktifkan JavaScript untuk memeriksa formulir. Pengiriman belum tersedia.</p></noscript>
      </div>
    </form>
  );
}
