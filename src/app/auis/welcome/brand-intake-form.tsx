"use client";

import { type FormEvent, useState } from "react";

type BrandRuntime = {
  name: string;
  tagline: string;
  logo: string;
  configured: boolean;
};

type FormStatus =
  | { kind: "idle"; message: string }
  | { kind: "saving"; message: string }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

type BrandIntakeFormProps = {
  initial: BrandRuntime;
};

function getErrorMessage(value: unknown) {
  if (typeof value === "object" && value !== null && "error" in value) {
    const error = value.error;

    if (typeof error === "string") {
      return error;
    }
  }

  return "Data brand belum tersimpan. Coba lagi.";
}

export default function BrandIntakeForm({ initial }: BrandIntakeFormProps) {
  const [name, setName] = useState(initial.name);
  const [tagline, setTagline] = useState(initial.tagline);
  const [logo, setLogo] = useState(initial.logo);
  const [status, setStatus] = useState<FormStatus>({ kind: "idle", message: "" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "saving", message: "Menyimpan perubahan..." });

    try {
      const response = await fetch("/api/auis/brand", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, tagline, logo, configured: initial.configured }),
      });

      let result: unknown = null;

      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        setStatus({ kind: "error", message: getErrorMessage(result) });
        return;
      }

      setStatus({
        kind: "success",
        message: "Perubahan brand tersimpan. Status konfigurasi tidak berubah.",
      });
    } catch {
      setStatus({
        kind: "error",
        message:
          "Tidak dapat terhubung ke server lokal. Pastikan server berjalan, lalu coba lagi.",
      });
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="brand-name">
          Nama produk
        </label>
        <input
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus-visible:border-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-300"
          id="brand-name"
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="brand-tagline">
          Positioning satu kalimat
        </label>
        <textarea
          className="min-h-32 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base leading-7 outline-none focus-visible:border-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-300"
          id="brand-tagline"
          maxLength={500}
          onChange={(event) => setTagline(event.target.value)}
          required
          value={tagline}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="brand-logo">
          Path logo publik
        </label>
        <input
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm outline-none focus-visible:border-zinc-900 focus-visible:ring-2 focus-visible:ring-zinc-300"
          id="brand-logo"
          maxLength={200}
          onChange={(event) => setLogo(event.target.value)}
          pattern="/assets/brand/[A-Za-z0-9._/-]+"
          required
          value={logo}
        />
        <p className="text-sm leading-6 text-zinc-600">
          Route setup lokal hanya menerima path di bawah <code>/assets/brand/</code>.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white outline-none transition hover:bg-zinc-700 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
          disabled={status.kind === "saving"}
          type="submit"
        >
          {status.kind === "saving" ? "Menyimpan..." : "Simpan perubahan"}
        </button>
        <p
          aria-live="polite"
          className={
            status.kind === "error"
              ? "text-sm text-red-700"
              : status.kind === "success"
                ? "text-sm text-green-700"
                : "text-sm text-zinc-600"
          }
          role="status"
        >
          {status.message}
        </p>
      </div>
    </form>
  );
}
