"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { z } from "zod";

import { FileUploadField, type FileUploadStatus } from "@/components/niuva/file-upload-field";
import { FormField } from "@/components/niuva/form-field";
import { StatusNotice } from "@/components/niuva/status-notice";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { Button, buttonVariants } from "@/components/ui/button";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Input } from "@/components/ui/input";
import { usePublicSiteInformation } from "@/components/niuva/public-site-information";
import { createPublicWhatsAppHref } from "@/features/public/company-content";
import type { CustomFlowProductOption } from "@/modules/custom-print/product-intake";
import { CUSTOM_FILE_MAX_BYTES } from "@/modules/policy/privacy";
import type { CustomerPreviewInput } from "@/modules/custom-print/customer-preview";
import type { PublicEstimatePrefill } from "@/modules/custom-print/public-estimate";
import { formatExactRupiah } from "@/modules/shared/format";

const acceptedExtensions = [".stl", ".3mf", ".obj", ".step", ".stp"] as const;
const maxFileSizeLabel = `${CUSTOM_FILE_MAX_BYTES / 1_024 / 1_024} MiB`;
const selectClass = "min-h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-2 text-base outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
// `select` always matches :read-only, so only text controls carry the account-field style.
const controlClass = `${selectClass} read-only:border-border read-only:bg-muted/60`;
const stepClass = "rounded-[var(--radius-card)] border border-border bg-card p-5 sm:p-7";
const stepTitleClass = "mb-5 flex items-center gap-3 text-xl font-medium tracking-[-0.015em]";

function StepNumber({ value }: { value: number }) {
  return <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-ui font-semibold text-brand-800 tabular-nums">{value}</span>;
}

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.string().trim().min(1).optional(),
);
const optionalDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim().length === 0 ? undefined : value),
  z.iso.date().optional(),
);
const unspecifiedProductValue = "CUSTOM_UNSPECIFIED";

const requestPreviewSchema = z.object({
  colorRequested: optionalText,
  customerEmail: z.email(),
  customerName: z.string().trim().min(1),
  customerPhone: z.string().trim().min(1),
  faculty: optionalText,
  materialRequested: z.string().trim().min(1),
  notes: optionalText,
  productInterest: z.preprocess(
    (value) => (typeof value !== "string" || value.trim().length === 0 ? unspecifiedProductValue : value),
    z.string().trim().min(1),
  ),
  quantity: z.coerce.number().int().positive(),
  requestedSize: optionalText,
  targetDeadline: optionalDate,
  unitConfirmation: z.string().trim().min(1),
});

type PreviewFieldName = keyof z.infer<typeof requestPreviewSchema> | "file" | "rightsAck" |
  "previewWeightG" | "previewHours" | "previewMinutes" | "previewSource";
type PreviewErrors = Partial<Record<PreviewFieldName, string>>;
type UploadScenario = "accepted" | "failed" | "expired";
type SubmitResult = "idle" | "pending" | "ready" | "unavailable" | "error";
type RequestFormMode = "live" | "preview" | "unavailable";

const uploadIntentResponseSchema = z.object({
  expiresAt: z.string().min(1),
  fileId: z.uuid(),
  requiredHeaders: z.object({ "content-type": z.string().min(1) }),
  uploadToken: z.string().min(1),
  uploadUrl: z.url({ protocol: /^https?$/ }),
});

const uploadConfirmationResponseSchema = z.object({
  fileId: z.uuid(),
  status: z.literal("UPLOADED"),
});

const customRequestResponseSchema = z.object({
  requestId: z.uuid(),
  referenceNumber: z.string().min(1),
  customerPreview: z.object({
    materialSubtotalRp: z.string(),
    machineSubtotalRp: z.string(),
    finalTotalRp: z.string(),
  }).nullish(),
});

const customerPreviewResponseSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("REVIEW_REQUIRED") }),
  z.object({ status: z.literal("READY"), materialSubtotalRp: z.string(),
    machineSubtotalRp: z.string(), finalTotalRp: z.string(), ruleVersion: z.number().int() }),
]);

const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

function readCustomerPreviewInput(formData: FormData): { input?: CustomerPreviewInput; errors: PreviewErrors } {
  if (formData.get("customerPreviewEnabled") !== "on") return { errors: {} };
  const errors: PreviewErrors = {};
  const weight = String(formData.get("previewWeightG") ?? "").trim();
  const hoursText = String(formData.get("previewHours") ?? "").trim();
  const minutesText = String(formData.get("previewMinutes") ?? "").trim();
  const hours = Number(hoursText);
  const minutes = Number(minutesText);
  if (!/^\d{1,6}(?:\.\d{1,6})?$/.test(weight) || Number(weight) <= 0) {
    errors.previewWeightG = "Masukkan berat positif per unit dari slicer.";
  }
  if (!/^\d+$/.test(hoursText) || !Number.isSafeInteger(hours) || hours < 0) {
    errors.previewHours = "Masukkan jam berupa bilangan bulat tidak negatif.";
  }
  if (!/^\d+$/.test(minutesText) || !Number.isSafeInteger(minutes) || minutes < 0 || minutes > 59) {
    errors.previewMinutes = "Masukkan menit dari 0 sampai 59.";
  }
  const seconds = (hours * 60 + minutes) * 60;
  if (!errors.previewHours && !errors.previewMinutes && (!Number.isSafeInteger(seconds) || seconds <= 0)) {
    errors.previewMinutes = "Durasi per unit harus lebih dari nol dan dalam batas angka aman.";
  }
  if (formData.get("previewSource") !== "on") {
    errors.previewSource = "Konfirmasi sumber angka dari slicer Anda.";
  }
  return Object.keys(errors).length > 0 ? { errors } : {
    errors,
    input: { source: "CUSTOMER_DECLARED_SLICER", weightGramsPerUnit: weight,
      printDurationSecondsPerUnit: seconds },
  };
}

const supportedMimeTypes: Record<string, readonly string[]> = {
  ".3mf": ["model/3mf", "application/vnd.ms-3mfdocument"],
  ".obj": ["model/obj", "text/plain"],
  ".step": ["model/step", "application/step"],
  ".stl": ["model/stl", "application/sla", "application/vnd.ms-pki.stl"],
  ".stp": ["model/step", "application/step"],
};

class ClientRequestError extends Error {
  readonly expired: boolean;

  constructor(message: string, { expired = false }: { expired?: boolean } = {}) {
    super(message);
    this.name = "ClientRequestError";
    this.expired = expired;
  }
}

const fieldLabels: Record<PreviewFieldName, string> = {
  colorRequested: "Warna",
  customerEmail: "Email",
  customerName: "Nama",
  customerPhone: "Nomor WhatsApp",
  faculty: "Fakultas/identitas",
  file: "File model",
  materialRequested: "Material",
  notes: "Catatan",
  productInterest: "Produk referensi",
  quantity: "Jumlah",
  rightsAck: "Persetujuan pemrosesan",
  previewWeightG: "Berat per unit",
  previewHours: "Jam per unit",
  previewMinutes: "Menit per unit",
  previewSource: "Sumber hasil slicer",
  requestedSize: "Ukuran target",
  targetDeadline: "Target diperlukan",
  unitConfirmation: "Unit atau skala",
};

function fileExtension(name: string) {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index).toLowerCase() : "";
}

function formatBytes(bytes: number) {
  if (bytes < 1_024) return `${bytes} B`;
  if (bytes < 1_024 * 1_024) return `${Math.ceil(bytes / 1_024)} KiB`;
  return `${(bytes / (1_024 * 1_024)).toFixed(1)} MiB`;
}

function fileMetadata(file: File) {
  const extension = fileExtension(file.name).slice(1).toUpperCase() || "Tanpa ekstensi";
  const reviewType = extension === "STEP" || extension === "STP" ? `${extension}, review manual` : extension;
  return `${reviewType} · ${formatBytes(file.size)}`;
}

export function RequestForm({
  customerEmail,
  liveEnabled = false,
  previewEnabled = false,
  initialProductInterest,
  initialEstimate,
  productOptions = [],
}: {
  customerEmail?: string;
  liveEnabled?: boolean;
  previewEnabled?: boolean;
  initialProductInterest?: string;
  /** Slicer numbers from the public calculator; the visitor still confirms their source. */
  initialEstimate?: PublicEstimatePrefill;
  productOptions?: readonly CustomFlowProductOption[];
}) {
  const mode: RequestFormMode = liveEnabled
    ? "live"
    : previewEnabled
      ? "preview"
      : "unavailable";
  const isLive = mode === "live";
  const isPreview = mode === "preview";
  const siteInformation = usePublicSiteInformation();
  const hydrated = useHydrated();
  const [errors, setErrors] = useState<PreviewErrors>({});
  const [file, setFile] = useState<File | null>(null);
  const [uploadedFileId, setUploadedFileId] = useState<string>();
  const [fileError, setFileError] = useState<string>();
  const [fileStatus, setFileStatus] = useState<FileUploadStatus>("idle");
  const [progress, setProgress] = useState<number>();
  const [scenario, setScenario] = useState<UploadScenario>("accepted");
  const [result, setResult] = useState<SubmitResult>("idle");
  const [referenceNumber, setReferenceNumber] = useState<string>();
  const [requestId, setRequestId] = useState<string>();
  const [serverError, setServerError] = useState<string>();
  const [previewStatus, setPreviewStatus] = useState<"idle" | "pending" | "ready" | "review" | "error">("idle");
  const [previewResult, setPreviewResult] = useState<z.infer<typeof customerPreviewResponseSchema> | null>(null);
  const [previewError, setPreviewError] = useState<string>();
  const [savedPreview, setSavedPreview] = useState<z.infer<typeof customRequestResponseSchema>["customerPreview"]>();
  const [previewOptedIn, setPreviewOptedIn] = useState(initialEstimate !== undefined);
  const pending = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const previewOperationRef = useRef(0);
  const scenarioRef = useRef<UploadScenario>("accepted");
  const statusRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const uploadOperationRef = useRef(0);
  const uploadAbortRef = useRef<AbortController | null>(null);

  function clearTimers() {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  }

  useEffect(() => () => {
    for (const timer of timers.current) clearTimeout(timer);
    uploadAbortRef.current?.abort();
    uploadOperationRef.current += 1;
  }, []);

  useEffect(() => {
    if (Object.keys(errors).length > 0 || result === "ready" || result === "unavailable" || result === "error") {
      statusRef.current?.focus();
    }
  }, [errors, result]);

  function schedule(callback: () => void, delay: number) {
    timers.current.push(setTimeout(callback, delay));
  }

  function resetLiveUpload() {
    uploadAbortRef.current?.abort();
    uploadAbortRef.current = null;
    uploadOperationRef.current += 1;
    setUploadedFileId(undefined);
  }

  function invalidatePreview() {
    previewOperationRef.current += 1;
    setPreviewStatus("idle");
    setPreviewResult(null);
    setPreviewError(undefined);
  }

  function isCurrentUpload(operationId: number) {
    return uploadOperationRef.current === operationId;
  }

  async function readApiResponse<T>(
    response: Response,
    schema: z.ZodType<T>,
    fallbackMessage: string,
  ): Promise<T> {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ClientRequestError(fallbackMessage);
    }

    if (!response.ok) {
      throw new ClientRequestError(
        response.status === 401 ? "Sesi upload berakhir. Pilih file untuk memulai kembali." : fallbackMessage,
        { expired: response.status === 401 },
      );
    }

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      throw new ClientRequestError(fallbackMessage);
    }

    return parsed.data;
  }

  function declaredMimeType(nextFile: File): string | undefined {
    const extension = fileExtension(nextFile.name);
    const supported = supportedMimeTypes[extension];
    if (supported === undefined) return undefined;

    const browserMime = nextFile.type.trim().toLowerCase();
    if (browserMime === "" || browserMime === "application/octet-stream") {
      return supported[0];
    }

    return supported.includes(browserMime) ? browserMime : undefined;
  }

  function validateSelectedFile(nextFile: File): string | undefined {
    const extension = fileExtension(nextFile.name);
    if (!acceptedExtensions.includes(extension as (typeof acceptedExtensions)[number])) {
      return `Gunakan STL, 3MF, OBJ, STEP, atau STP untuk ${isPreview ? "preview ini" : "upload privat ini"}.`;
    }
    if (nextFile.size <= 0 || nextFile.size > CUSTOM_FILE_MAX_BYTES) {
      return `Ukuran file harus lebih dari 0 B dan tidak melebihi ${maxFileSizeLabel}.`;
    }
    if (isLive && declaredMimeType(nextFile) === undefined) {
      return "Tipe file tidak cocok dengan ekstensi. Pilih file model yang sesuai.";
    }
    return undefined;
  }

  function simulateFile(nextFile: File, nextScenario: UploadScenario = scenarioRef.current) {
    invalidatePreview();
    clearTimers();
    setFile(nextFile);
    setFileError(undefined);
    setResult("idle");
    setErrors((current) => {
      const next = { ...current };
      delete next.file;
      return next;
    });

    const validationError = validateSelectedFile(nextFile);
    if (validationError !== undefined) {
      setFileStatus("invalid");
      setProgress(undefined);
      setFileError(validationError);
      return;
    }

    setFileStatus("uploading");
    setProgress(12);
    schedule(() => setProgress(58), 160);
    schedule(() => {
      setFileStatus("validating");
      setProgress(86);
    }, 320);
    schedule(() => {
      if (nextScenario === "failed") {
        setFileStatus("failed");
        setProgress(64);
        return;
      }
      if (nextScenario === "expired") {
        setFileStatus("expired");
        setProgress(86);
        return;
      }
      setFileStatus("accepted");
      setProgress(100);
    }, 520);
  }

  async function uploadFile(nextFile: File) {
    invalidatePreview();
    resetLiveUpload();
    clearTimers();
    setFile(nextFile);
    setFileError(undefined);
    setResult("idle");
    setReferenceNumber(undefined);
    setRequestId(undefined);
    setServerError(undefined);
    setErrors((current) => {
      const next = { ...current };
      delete next.file;
      return next;
    });

    const validationError = validateSelectedFile(nextFile);
    if (validationError !== undefined) {
      setFileStatus("invalid");
      setProgress(undefined);
      setFileError(validationError);
      return;
    }

    const controller = new AbortController();
    const operationId = uploadOperationRef.current + 1;
    uploadOperationRef.current = operationId;
    uploadAbortRef.current = controller;
    setFileStatus("uploading");
    setProgress(12);

    try {
      const mimeType = declaredMimeType(nextFile);
      if (mimeType === undefined) {
        throw new ClientRequestError("Tipe file tidak cocok dengan ekstensi. Pilih file model yang sesuai.");
      }

      const intentResponse = await fetch("/api/uploads/intents", {
        body: JSON.stringify({
          mimeType,
          originalName: nextFile.name,
          sizeBytes: nextFile.size,
        }),
        headers: { "content-type": "application/json" },
        method: "POST",
        signal: controller.signal,
      });
      const intent = await readApiResponse(
        intentResponse,
        uploadIntentResponseSchema,
        "Sesi upload privat belum dapat dibuat. Coba lagi.",
      );
      if (!isCurrentUpload(operationId)) return;

      setProgress(28);
      const objectResponse = await fetch(intent.uploadUrl, {
        body: nextFile,
        headers: intent.requiredHeaders,
        method: "PUT",
        signal: controller.signal,
      });
      if (!objectResponse.ok) {
        throw new ClientRequestError("Coba upload kembali.");
      }
      if (!isCurrentUpload(operationId)) return;

      setFileStatus("validating");
      setProgress(82);
      const confirmationResponse = await fetch("/api/uploads/confirm", {
        body: JSON.stringify({ fileId: intent.fileId, uploadToken: intent.uploadToken }),
        headers: { "content-type": "application/json" },
        method: "POST",
        signal: controller.signal,
      });
      const confirmation = await readApiResponse(
        confirmationResponse,
        uploadConfirmationResponseSchema,
        "File belum lolos pemeriksaan server. Coba upload kembali.",
      );
      if (!isCurrentUpload(operationId)) return;

      setUploadedFileId(confirmation.fileId);
      setFileStatus("accepted");
      setProgress(100);
      uploadAbortRef.current = null;
    } catch (error) {
      if (!isCurrentUpload(operationId)) return;
      uploadAbortRef.current = null;
      if (error instanceof DOMException && error.name === "AbortError") return;

      setUploadedFileId(undefined);
      setFileStatus(error instanceof ClientRequestError && error.expired ? "expired" : "failed");
      setProgress(undefined);
      setFileError(
        error instanceof ClientRequestError && error.expired
          ? error.message
          : error instanceof ClientRequestError
            ? error.message
            : "Coba upload kembali.",
      );
    }
  }

  function removeFile() {
    invalidatePreview();
    clearTimers();
    resetLiveUpload();
    setFile(null);
    setFileError(undefined);
    setFileStatus("idle");
    setProgress(undefined);
    setResult("idle");
    setReferenceNumber(undefined);
    setRequestId(undefined);
    setServerError(undefined);
    pending.current = false;
  }

  async function previewCustomerComponents() {
    const form = formRef.current;
    if (!form || !isLive) return;
    const formData = new FormData(form);
    const preview = readCustomerPreviewInput(formData);
    setErrors(preview.errors);
    if (!preview.input) {
      setPreviewStatus("review");
      return;
    }
    const materialRequested = String(formData.get("materialRequested") ?? "");
    const quantity = Number(formData.get("quantity"));
    if (!uploadedFileId || !file || ![".stl", ".obj", ".3mf"].includes(fileExtension(file.name)) ||
      !["PLA", "ABS"].includes(materialRequested) || !Number.isSafeInteger(quantity) || quantity <= 0) {
      setPreviewStatus("review");
      return;
    }
    const operationId = ++previewOperationRef.current;
    setPreviewStatus("pending");
    setPreviewError(undefined);
    try {
      const response = await fetch("/api/custom-print/preview-estimate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileId: uploadedFileId, materialRequested, quantity,
          customerPreviewInput: preview.input }),
      });
      const result = await readApiResponse(response, customerPreviewResponseSchema,
        "Simulasi belum dapat dihitung. Anda tetap dapat mengajukan request untuk review.");
      if (previewOperationRef.current !== operationId) return;
      setPreviewResult(result);
      setPreviewStatus(result.status === "READY" ? "ready" : "review");
    } catch (error) {
      if (previewOperationRef.current !== operationId) return;
      setPreviewError(error instanceof ClientRequestError ? error.message : "Simulasi belum tersedia.");
      setPreviewStatus("error");
    }
  }

  async function submitLiveRequest(parsed: z.infer<typeof requestPreviewSchema>, fileId: string,
    customerPreviewInput?: CustomerPreviewInput) {
    const response = await fetch("/api/custom-print/requests", {
      body: JSON.stringify({ ...parsed, fileIds: [fileId],
        ...(customerPreviewInput === undefined ? {} : { customerPreviewInput }) }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });
    return readApiResponse(
      response,
      customRequestResponseSchema,
      "Request belum tersimpan. Coba lagi setelah koneksi pulih.",
    );
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;

    const formData = new FormData(event.currentTarget);
    const parsed = requestPreviewSchema.safeParse(Object.fromEntries(formData));
    const nextErrors: PreviewErrors = {};
    const preview = readCustomerPreviewInput(formData);
    Object.assign(nextErrors, preview.errors);
    const fileIdForSubmit = uploadedFileId;

    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const name = String(issue.path[0]) as keyof z.infer<typeof requestPreviewSchema>;
        nextErrors[name] = name === "customerEmail"
          ? "Masukkan alamat email yang valid."
          : name === "quantity"
            ? "Masukkan jumlah berupa bilangan bulat lebih dari nol."
            : "Lengkapi informasi ini sebelum melanjutkan.";
      }
    }
    if (!file || fileStatus !== "accepted") {
      nextErrors.file = "Selesaikan pemeriksaan metadata file sebelum melanjutkan.";
      if (!file) {
        setFileStatus("invalid");
        setFileError(`Pilih satu file model untuk melengkapi ${isPreview ? "preview request" : "request ini"}.`);
      }
    }
    if (isLive && fileIdForSubmit === undefined) {
      nextErrors.file = "Tunggu sampai file selesai diunggah dan diverifikasi.";
    }
    if (formData.get("rightsAck") !== "on") {
      nextErrors.rightsAck = "Persetujuan diperlukan sebelum melanjutkan.";
    }

    setResult("idle");
    setErrors(nextErrors);
    if (!parsed.success || Object.keys(nextErrors).length > 0) return;

    if (mode === "unavailable") {
      setResult("unavailable");
      return;
    }

    pending.current = true;
    setResult("pending");
    if (isPreview) {
      schedule(() => {
        pending.current = false;
        setResult("ready");
      }, 500);
      return;
    }

    if (fileIdForSubmit === undefined) return;

    void submitLiveRequest(parsed.data, fileIdForSubmit, preview.input)
      .then((response) => {
        pending.current = false;
        setReferenceNumber(response.referenceNumber);
        setRequestId(response.requestId);
        setSavedPreview(response.customerPreview);
        setResult("ready");
      })
      .catch((error) => {
        pending.current = false;
        setServerError(error instanceof ClientRequestError ? error.message : "Request belum tersimpan. Coba lagi.");
        setResult("error");
      });
  }

  const fileBusy = fileStatus === "uploading" || fileStatus === "validating" || fileStatus === "retrying";

  return (
    <form
      aria-busy={result === "pending"}
      aria-label="Form request custom print"
      className="space-y-6"
      data-custom-request-form
      noValidate
      onSubmit={submit}
      ref={formRef}
    >
      {isPreview ? (
        <StatusNotice aria-label="Kontrol preview pengajuan" role="note" size="compact" title="Preview lokal · tidak membuat pengajuan" tone="info">
          <label className="mb-2 block text-ui font-medium" htmlFor="custom-upload-scenario">Hasil simulasi file</label>
          <select
            className={selectClass}
            disabled={!hydrated || fileBusy || result === "pending"}
            id="custom-upload-scenario"
            onChange={(event) => {
              const next = event.target.value as UploadScenario;
              scenarioRef.current = next;
              setScenario(next);
              setResult("idle");
            }}
            value={scenario}
          >
            <option value="accepted">Metadata sesuai</option>
            <option value="failed">Simulasi gagal</option>
            <option value="expired">Sesi berakhir</option>
          </select>
        </StatusNotice>
      ) : mode === "unavailable" ? (
        <StatusNotice
          description="Formulir tetap bisa dibaca, tetapi file dan pengajuan belum bisa dikirim saat ini."
          title="Pengiriman privat belum tersedia."
          tone="info"
        />
      ) : null}

      <div className="rounded-[var(--radius-control)] empty:hidden focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" ref={statusRef} tabIndex={-1}>
        {Object.keys(errors).length > 0 ? (
          <StatusNotice title="Periksa kembali request Anda." tone="error">
            <ul className="list-inside list-disc">
              {Object.entries(errors).map(([name, message]) => (
                <li key={name}>
                  <a
                    className="underline underline-offset-4"
                    href={`#custom-${name}`}
                    onClick={(event) => {
                      event.preventDefault();
                      document.getElementById(`custom-${name}`)?.focus();
                    }}
                  >
                    {fieldLabels[name as PreviewFieldName]}: {message}
                  </a>
                </li>
              ))}
            </ul>
          </StatusNotice>
        ) : null}
        {result === "pending" ? (
          <p className="text-ui text-muted-foreground" role="status">
            {isPreview ? "Memeriksa preview request. Data tidak dikirim." : "Mengirim request ke review operator."}
          </p>
        ) : null}
        {result === "ready" && isPreview ? (
          <StatusNotice
            enter
            description="Informasi dan metadata file lolos pemeriksaan lokal. Tidak ada file, request, nomor referensi, atau pesan yang dikirim."
            title="Preview request siap ditinjau."
            tone="success"
          />
        ) : null}
        {result === "ready" && isLive && referenceNumber ? (
          <div className="space-y-3"><StatusNotice
            enter
            action={
              <div className="flex flex-wrap gap-2">
                {requestId ? <NiuvaLink className="min-h-11" href={`/account/make/${requestId}`}>Lihat status di akun</NiuvaLink> : null}
                <a
                  className={buttonVariants({ className: "min-h-11", variant: "outline" })}
                  href={createPublicWhatsAppHref(referenceNumber, siteInformation.phone)}
                  rel="noreferrer"
                >
                  Lanjutkan melalui WhatsApp
                </a>
              </div>
            }
            description={`Nomor referensi Anda ${referenceNumber}. Operator akan meninjau file dan kebutuhan Anda.`}
            title="Request tersimpan untuk review operator."
            tone="success"
          />
          {savedPreview ? <StatusNotice description={`Angka ini berasal dari input slicer Anda dan belum diperiksa operator.${previewResult?.status === "READY" && previewResult.finalTotalRp !== savedPreview.finalTotalRp ? " Nilai tersimpan berbeda dari simulasi sebelumnya karena dihitung ulang saat request dikirim." : ""}`} enter role="note" size="compact" title={`Simulasi biaya awal yang tersimpan bersama request: ${rupiah.format(BigInt(savedPreview.finalTotalRp))}.`} tone="info" /> : previewOptedIn ? <p className="text-ui font-normal text-muted-foreground">Simulasi biaya awal belum tersedia untuk request ini. Operator akan meninjau file dan biaya pekerjaan.</p> : null}</div>
        ) : null}
        {result === "unavailable" ? (
          <StatusNotice
            enter
            description="Tidak ada file atau informasi yang dikirim. Simpan catatan Anda di tempat lain sebelum meninggalkan halaman."
            title="Pengiriman request belum tersedia."
            tone="info"
          />
        ) : null}
        {result === "error" ? (
          <StatusNotice
            enter
            description={serverError ?? "Request belum tersimpan. Coba lagi."}
            title="Request belum tersimpan."
            tone="error"
          />
        ) : null}
      </div>

      <fieldset className="min-w-0 space-y-6" disabled={mode === "unavailable" || result === "pending" || result === "ready"}>
        <legend className="sr-only">Informasi request custom print</legend>

        <section aria-labelledby="file-section-title" className={stepClass}>
          <h2 className={stepTitleClass} id="file-section-title"><StepNumber value={1} />File model</h2>
          <p className="-mt-2 mb-5 text-ui font-normal leading-[1.55] text-muted-foreground">
            {isLive
              ? "File langsung tersimpan di ruang privat Niuva dan hanya dibuka operator untuk review."
              : isPreview
                ? "Preview hanya membaca nama, jenis, dan ukuran file. Isinya tidak diunggah."
                : "Unggah model belum tersedia saat ini."}
            {" "}Tanda * menandai isian wajib.
          </p>
          <FileUploadField
            acceptedExtensions={acceptedExtensions}
            description="STL, 3MF, atau OBJ untuk model. STEP/STP diterima sebagai lampiran yang diperiksa manual."
            disabled={!hydrated || mode === "unavailable"}
            error={fileError}
            fileMeta={file ? fileMetadata(file) : undefined}
            fileName={file?.name}
            id="custom-file"
            label="File model 3D *"
            maxSizeLabel={maxFileSizeLabel}
            mode={isPreview ? "preview" : "live"}
            onRemove={file ? removeFile : undefined}
            onRetry={file ? () => {
              if (isPreview) {
                setFileStatus("retrying");
                setProgress(8);
                schedule(() => simulateFile(file), 120);
              } else {
                void uploadFile(file);
              }
            } : undefined}
            onSelect={(nextFile) => {
              if (!nextFile) return;
              if (isPreview) {
                simulateFile(nextFile);
              } else {
                void uploadFile(nextFile);
              }
            }}
            progress={progress}
            status={fileStatus}
          />
        </section>

        <section aria-labelledby="configuration-section-title" className={stepClass}>
          <h2 className={stepTitleClass} id="configuration-section-title"><StepNumber value={2} />Konfigurasi awal</h2>
          <p className="-mt-2 mb-5 text-ui font-normal leading-[1.55] text-muted-foreground">Operator memeriksa pilihan ini saat review. Nilai yang belum pasti bisa dijelaskan di catatan.</p>
          <div className="grid gap-5 sm:grid-cols-2">
            {productOptions.length > 0 ? (
              <FormField
                className="sm:col-span-2"
                description="Pilihan ini hanya memberi konteks. Produk custom tetap melalui review dan quote, tanpa checkout langsung."
                error={errors.productInterest}
                id="custom-productInterest"
                label="Produk yang diminati"
                required
              >
                <select
                  className={selectClass}
                  defaultValue={initialProductInterest ?? unspecifiedProductValue}
                  name="productInterest"
                  required
                >
                  <option value={unspecifiedProductValue}>Belum menentukan / kebutuhan custom lain</option>
                  {productOptions.map((product) => (
                    <option key={product.sourceProductId} value={product.sourceProductId}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </FormField>
            ) : <input name="productInterest" type="hidden" value={unspecifiedProductValue} />}
            <FormField error={errors.materialRequested} id="custom-materialRequested" label="Material" required>
              <select className={selectClass} defaultValue={initialEstimate?.material ?? ""} name="materialRequested" onChange={invalidatePreview} required>
                <option value="">Pilih kebutuhan material</option>
                <option value="PLA">PLA</option>
                <option value="ABS">ABS</option>
                <option value="OWN_FILAMENT">Membawa filament sendiri</option>
                <option value="NEEDS_RECOMMENDATION">Perlu rekomendasi operator</option>
              </select>
            </FormField>
            <FormField error={errors.colorRequested} id="custom-colorRequested" label="Warna (opsional)">
              <Input className={controlClass} name="colorRequested" />
            </FormField>
            <FormField error={errors.quantity} id="custom-quantity" label="Jumlah" required>
              <Input className={controlClass} defaultValue={initialEstimate?.quantity} inputMode="numeric" min={1} name="quantity" onChange={invalidatePreview} required type="number" />
            </FormField>
            <FormField error={errors.requestedSize} id="custom-requestedSize" label="Ukuran target (opsional)">
              <Input className={controlClass} name="requestedSize" placeholder="Contoh: 8 cm atau mengikuti referensi" />
            </FormField>
            <FormField description="Konfirmasi ini mencegah salah ukuran, terutama pada STL." error={errors.unitConfirmation} id="custom-unitConfirmation" label="Unit atau skala" required>
              <select className={selectClass} defaultValue="" name="unitConfirmation" required>
                <option value="">Pilih konfirmasi unit</option>
                <option value="MILLIMETER_CONFIRMED">Model sudah menggunakan milimeter</option>
                <option value="OTHER_UNIT_NOTED">Unit lain, dijelaskan di catatan</option>
                <option value="NEEDS_OPERATOR_HELP">Belum yakin, perlu bantuan operator</option>
              </select>
            </FormField>
            <FormField description="Hanya target untuk dibahas, bukan janji selesai." error={errors.targetDeadline} id="custom-targetDeadline" label="Target diperlukan (opsional)">
              <Input className={controlClass} name="targetDeadline" type="date" />
            </FormField>
            <FormField className="sm:col-span-2" error={errors.faculty} id="custom-faculty" label="Fakultas/identitas (opsional)">
              <Input className={controlClass} name="faculty" placeholder="Contoh: Fakultas Teknik" />
            </FormField>
            <FormField className="sm:col-span-2" description="Fungsi, area kritis, orientasi cetak, atau hal lain yang perlu diperiksa." error={errors.notes} id="custom-notes" label="Catatan (opsional)">
              <textarea className={controlClass} name="notes" rows={4} />
            </FormField>
          </div>
        </section>

        <section aria-labelledby="customer-preview-title" className={stepClass}>
          <h2 className={stepTitleClass} id="customer-preview-title"><StepNumber value={3} />Simulasi biaya awal (opsional)</h2>
          <p className="-mt-2 mb-5 text-ui font-normal leading-[1.55] text-muted-foreground">Isi berat dan durasi cetak <strong className="font-semibold text-foreground">per unit</strong> dari slicer Anda; jumlah dihitung otomatis. Simulasi hanya mencakup PLA/ABS dari stok Niuva dan waktu mesin.</p>
          <div className="space-y-5">
            {!isLive && <StatusNotice title="Perlu review" description="Simulasi memerlukan upload model privat yang aktif. Operator tetap menghitung biaya saat review." tone="info" />}
            <label className="flex min-h-11 items-start gap-3 text-ui font-medium">
              <input className="mt-0.5 size-5 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" defaultChecked={initialEstimate !== undefined} disabled={!isLive} name="customerPreviewEnabled" onChange={(event) => { setPreviewOptedIn(event.target.checked); invalidatePreview(); }} type="checkbox" />
              <span>Saya ingin menyertakan input slicer untuk simulasi komponen.</span>
            </label>
            <fieldset className="min-w-0 space-y-5" disabled={!isLive || !previewOptedIn}>
              <legend className="sr-only">Input slicer per unit</legend>
              <div className="grid gap-5 sm:grid-cols-3">
                <FormField description="Gram untuk satu unit, bukan total pesanan." error={errors.previewWeightG} id="custom-previewWeightG" label="Berat hasil slicer per unit (g)">
                  <Input className={controlClass} defaultValue={initialEstimate?.weightGramsPerUnit} inputMode="decimal" name="previewWeightG" onChange={invalidatePreview} placeholder="Contoh: 18.4" type="text" />
                </FormField>
                <FormField error={errors.previewHours} id="custom-previewHours" label="Durasi per unit (jam)">
                  <Input className={controlClass} defaultValue={initialEstimate?.hours ?? 0} min={0} name="previewHours" onChange={invalidatePreview} type="number" />
                </FormField>
                <FormField error={errors.previewMinutes} id="custom-previewMinutes" label="Durasi per unit (menit)">
                  <Input className={controlClass} defaultValue={initialEstimate?.minutes ?? 0} max={59} min={0} name="previewMinutes" onChange={invalidatePreview} type="number" />
                </FormField>
              </div>
              <FormField description="Berat dan durasi berasal dari slicer Anda untuk satu unit model ini. Operator belum memeriksanya." error={errors.previewSource} id="custom-previewSource" label="Saya mengisi angka dari slicer sendiri">
                <input className="size-5 accent-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" name="previewSource" onChange={invalidatePreview} type="checkbox" />
              </FormField>
              <Button className="min-h-11" disabled={fileBusy || previewStatus === "pending"} onClick={() => void previewCustomerComponents()} type="button" variant="outline">{previewStatus === "pending" ? "Menghitung…" : "Lihat simulasi komponen"}</Button>
              <div aria-live="polite">
                {previewStatus === "ready" && previewResult?.status === "READY" ? <div className="rounded-[var(--radius-control)] border border-border bg-neutral-50 p-5">
                  <p className="text-ui font-semibold">Simulasi biaya awal</p>
                  <dl className="mt-4 space-y-2 text-ui font-normal"><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Material</dt><dd className="tabular-nums">{formatExactRupiah(previewResult.materialSubtotalRp)}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted-foreground">Waktu mesin</dt><dd className="tabular-nums">{formatExactRupiah(previewResult.machineSubtotalRp)}</dd></div></dl>
                  <p className="mt-4 border-t border-border pt-3 text-lg font-semibold tabular-nums">Total komponen indikatif {rupiah.format(BigInt(previewResult.finalTotalRp))}</p>
                  <p className="mt-2 text-ui font-normal leading-[1.55] text-muted-foreground">Estimasi awal, bukan harga final. Setup, finishing, biaya lain, dan ongkir belum termasuk. Operator memeriksa file dan konfigurasi sebelum mengirim quote.</p>
                </div> : previewStatus === "review" ? <p className="text-ui font-normal text-muted-foreground">Perlu review. Simulasi hanya tampil untuk STL/OBJ/3MF, PLA/ABS stok Niuva, dan input slicer per unit yang lengkap.</p> : previewStatus === "error" ? <p className="text-ui font-normal text-destructive" role="alert">{previewError}</p> : null}
              </div>
            </fieldset>
          </div>
        </section>

        <section aria-labelledby="contact-section-title" className={stepClass}>
          <h2 className={stepTitleClass} id="contact-section-title"><StepNumber value={4} />Kontak untuk review</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField error={errors.customerName} id="custom-customerName" label="Nama" required>
              <Input autoComplete="name" className={controlClass} name="customerName" required />
            </FormField>
            <FormField error={errors.customerEmail} id="custom-customerEmail" label="Email" required>
              <Input autoComplete="email" className={controlClass} defaultValue={customerEmail} name="customerEmail" readOnly={customerEmail !== undefined} required type="email" />
            </FormField>
            <FormField className="sm:col-span-2" description="Dipakai operator bila ada yang perlu dibahas tentang model Anda." error={errors.customerPhone} id="custom-customerPhone" label="Nomor WhatsApp" required>
              <Input autoComplete="tel" className={controlClass} name="customerPhone" required type="tel" />
            </FormField>
          </div>
          <div className="mt-6 border-t border-border pt-5">
            <FormField
              description="Saya berhak membagikan file ini untuk pemeriksaan custom print oleh Niuva."
              error={errors.rightsAck}
              id="custom-rightsAck"
              label="Persetujuan pemrosesan"
              required
            >
              <input className="size-5 accent-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" name="rightsAck" required type="checkbox" />
            </FormField>
          </div>
        </section>
      </fieldset>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Button
          className="min-h-11 w-full sm:w-auto"
          disabled={!hydrated || mode === "unavailable" || fileBusy || result === "pending" || result === "ready"}
          size="lg"
          type="submit"
        >
          {result === "pending"
            ? isPreview ? "Memeriksa preview" : "Mengirim request"
            : isPreview ? "Uji request tanpa mengirim" : isLive ? "Ajukan untuk Review" : "Pengiriman belum tersedia"}
        </Button>
        <p className="text-ui font-normal text-muted-foreground">Mengajukan belum membuat pesanan atau pembayaran.</p>
        <noscript><p className="text-ui">Aktifkan JavaScript untuk mengirim file dan request secara aman.</p></noscript>
      </div>
    </form>
  );
}
