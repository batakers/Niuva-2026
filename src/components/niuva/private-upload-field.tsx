"use client";

import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { REFERENCE_PHOTO_MAX_BYTES } from "@/modules/policy/privacy";

import { FileUploadField, type FileUploadStatus } from "./file-upload-field";

const mimeTypes: Readonly<Record<string, readonly string[]>> = {
  ".3mf": ["model/3mf", "application/vnd.ms-3mfdocument"],
  ".jpeg": ["image/jpeg"],
  ".jpg": ["image/jpeg"],
  ".obj": ["model/obj", "text/plain"],
  ".png": ["image/png"],
  ".step": ["model/step", "application/step"],
  ".stl": ["model/stl", "application/sla", "application/vnd.ms-pki.stl"],
  ".stp": ["model/step", "application/step"],
};

const intentSchema = z.object({
  fileId: z.uuid(),
  requiredHeaders: z.object({ "content-type": z.string().min(1) }),
  uploadToken: z.string().min(1),
  uploadUrl: z.url({ protocol: /^https?$/ }),
});
const confirmationSchema = z.object({ fileId: z.uuid(), status: z.literal("UPLOADED") });

function extensionOf(name: string): string {
  return name.slice(name.lastIndexOf(".")).toLowerCase();
}

export function PrivateUploadField({
  acceptedExtensions,
  description,
  disabled = false,
  id,
  label,
  maxBytes,
  onBusyChange,
  onFileChange,
  intentUrl = "/api/uploads/intents",
}: Readonly<{
  intentUrl?: string;
  acceptedExtensions: readonly string[];
  description: string;
  disabled?: boolean;
  id: string;
  label: string;
  maxBytes: number;
  onBusyChange?: (busy: boolean) => void;
  onFileChange: (fileId: string | undefined, extension: string | undefined) => void;
}>) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<FileUploadStatus>("idle");
  const [error, setError] = useState<string>();
  const operation = useRef(0);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => {
    controller.current?.abort();
    operation.current += 1;
  }, []);

  function reset() {
    controller.current?.abort();
    operation.current += 1;
    controller.current = null;
    setFile(null);
    setStatus("idle");
    setError(undefined);
    onBusyChange?.(false);
    onFileChange(undefined, undefined);
  }

  async function upload(nextFile: File) {
    controller.current?.abort();
    const current = operation.current + 1;
    operation.current = current;
    const abort = new AbortController();
    controller.current = abort;
    setFile(nextFile);
    setError(undefined);
    onBusyChange?.(true);
    onFileChange(undefined, undefined);

    const extension = extensionOf(nextFile.name);
    const supported = mimeTypes[extension];
    const declaredType = nextFile.type.trim().toLowerCase();
    const mimeType = declaredType === "" || declaredType === "application/octet-stream"
      ? supported?.[0]
      : supported?.includes(declaredType) ? declaredType : undefined;
    const effectiveMaxBytes = [".jpg", ".jpeg", ".png"].includes(extension)
      ? Math.min(maxBytes, REFERENCE_PHOTO_MAX_BYTES)
      : maxBytes;
    if (!acceptedExtensions.includes(extension) || mimeType === undefined ||
      nextFile.size <= 0 || nextFile.size > effectiveMaxBytes) {
      setStatus("invalid");
      onBusyChange?.(false);
      setError("Periksa format dan ukuran file yang diizinkan, lalu pilih kembali.");
      return;
    }

    setStatus("uploading");
    try {
      const intentResponse = await fetch(intentUrl, {
        body: JSON.stringify({ mimeType, originalName: nextFile.name, sizeBytes: nextFile.size }),
        headers: { "content-type": "application/json" },
        method: "POST",
        signal: abort.signal,
      });
      if (!intentResponse.ok) throw new Error("Sesi upload belum dapat dibuat.");
      const intent = intentSchema.parse(await intentResponse.json());
      const objectResponse = await fetch(intent.uploadUrl, {
        body: nextFile,
        headers: intent.requiredHeaders,
        method: "PUT",
        signal: abort.signal,
      });
      if (!objectResponse.ok) throw new Error("File belum berhasil diunggah.");
      if (operation.current !== current) return;
      setStatus("validating");
      const confirmationResponse = await fetch("/api/uploads/confirm", {
        body: JSON.stringify({ fileId: intent.fileId, uploadToken: intent.uploadToken }),
        headers: { "content-type": "application/json" },
        method: "POST",
        signal: abort.signal,
      });
      if (!confirmationResponse.ok) throw new Error("File belum lolos pemeriksaan server.");
      const confirmation = confirmationSchema.parse(await confirmationResponse.json());
      if (operation.current !== current) return;
      setStatus("accepted");
      onBusyChange?.(false);
      controller.current = null;
      onFileChange(confirmation.fileId, extension);
    } catch (cause) {
      if (operation.current !== current || (cause instanceof DOMException && cause.name === "AbortError")) return;
      controller.current = null;
      setStatus("failed");
      onBusyChange?.(false);
      setError(cause instanceof Error ? cause.message : "Upload gagal. Coba kembali.");
    }
  }

  return <FileUploadField
    acceptedExtensions={acceptedExtensions}
    description={description}
    disabled={disabled}
    error={error}
    fileName={file?.name}
    id={id}
    label={label}
    maxSizeLabel={`${maxBytes / 1_024 / 1_024} MiB${maxBytes > REFERENCE_PHOTO_MAX_BYTES && acceptedExtensions.includes(".jpg") ? "; foto 10 MiB" : ""}`}
    onRemove={file ? reset : undefined}
    onRetry={file ? () => { void upload(file); } : undefined}
    onSelect={(nextFile) => { if (nextFile) void upload(nextFile); }}
    status={status}
  />;
}
