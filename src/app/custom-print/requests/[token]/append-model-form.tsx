"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { PrivateUploadField } from "@/components/niuva/private-upload-field";
import { StatusNotice } from "@/components/niuva/status-notice";
import { Button } from "@/components/ui/button";
import { CUSTOM_FILE_MAX_BYTES } from "@/modules/policy/privacy";

const controlClass = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AppendModelForm({ token, requestId }: Readonly<{ token?: string; requestId?: string }>) {
  const router = useRouter();
  const [fileId, setFileId] = useState<string>();
  const [extension, setExtension] = useState<string>();
  const [unitConfirmation, setUnitConfirmation] = useState("");
  const [uploadBusy, setUploadBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string }>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || uploadBusy) return;
    if (fileId === undefined) {
      setMessage({ tone: "error", text: "Unggah model sampai selesai sebelum melanjutkan." });
      return;
    }
    if (extension === ".stl" && unitConfirmation === "") {
      setMessage({ tone: "error", text: "Konfirmasi unit atau skala model STL terlebih dahulu." });
      return;
    }
    setPending(true);
    setMessage(undefined);
    try {
      const endpoint = requestId === undefined
        ? `/api/custom-print/requests/${encodeURIComponent(token ?? "")}/files`
        : `/api/account/make/${encodeURIComponent(requestId)}/model`;
      const response = await fetch(endpoint, {
        body: JSON.stringify({ fileId, ...(unitConfirmation ? { unitConfirmation } : {}) }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      if (!response.ok) throw new Error("Model belum dapat dihubungkan. Periksa status request lalu coba lagi.");
      setMessage({ tone: "success", text: "Model sudah terikat ke request ini dan siap ditinjau operator." });
      setFileId(undefined);
      router.refresh();
    } catch (error) {
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Model belum dapat dihubungkan." });
    } finally {
      setPending(false);
    }
  }

  return <form className="mt-6 space-y-5 rounded-xl border border-border bg-card p-5 sm:p-6" onSubmit={submit}>
    <div>
      <h2 className="text-xl font-semibold">Tambahkan model ke request ini</h2>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">Nomor referensi tetap sama. File model akan diperiksa operator sebelum quote dibuat.</p>
    </div>
    <PrivateUploadField
      acceptedExtensions={[".stl", ".3mf", ".obj", ".step", ".stp"]}
      description="STL, 3MF, dan OBJ untuk model awal; STEP/STP untuk review manual. File tetap privat."
      disabled={pending}
      id="append-model-file"
      intentUrl={requestId === undefined
        ? `/api/custom-print/requests/${encodeURIComponent(token ?? "")}/upload-intent`
        : undefined}
      label="File model 3D/CAD"
      maxBytes={CUSTOM_FILE_MAX_BYTES}
      onBusyChange={setUploadBusy}
      onFileChange={(nextId, nextExtension) => { setFileId(nextId); setExtension(nextExtension); setMessage(undefined); }}
    />
    <label className="grid gap-2 text-sm font-medium" htmlFor="append-model-unit">
      Unit atau skala {extension === ".stl" ? "(wajib untuk STL)" : "(jika diketahui)"}
      <select className={controlClass} id="append-model-unit" onChange={(event) => setUnitConfirmation(event.target.value)} value={unitConfirmation}>
        <option value="">Belum ditentukan</option>
        <option value="MILLIMETER_CONFIRMED">Model menggunakan milimeter</option>
        <option value="OTHER_UNIT_NOTED">Unit lain, jelaskan kepada operator</option>
        <option value="NEEDS_OPERATOR_HELP">Belum yakin, perlu bantuan operator</option>
      </select>
    </label>
    {message && <StatusNotice description={message.text} title={message.tone === "success" ? "Model diterima" : "Periksa pengiriman model"} tone={message.tone} />}
    <Button className="min-h-11" disabled={pending || uploadBusy || fileId === undefined} type="submit">
      {pending ? "Menghubungkan model…" : "Tambahkan ke request"}
    </Button>
  </form>;
}
