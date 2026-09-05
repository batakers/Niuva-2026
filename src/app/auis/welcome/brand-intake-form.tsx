"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
        <Label htmlFor="brand-name">
          Nama produk
        </Label>
        <Input
          id="brand-name"
          maxLength={80}
          onChange={(event) => setName(event.target.value)}
          required
          value={name}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="brand-tagline">
          Positioning satu kalimat
        </Label>
        <textarea
          className="min-h-32 w-full rounded-lg border border-input bg-background px-2.5 py-2 text-base leading-7 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          id="brand-tagline"
          maxLength={500}
          onChange={(event) => setTagline(event.target.value)}
          required
          value={tagline}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="brand-logo">
          Path logo publik
        </Label>
        <Input
          className="font-mono text-sm"
          id="brand-logo"
          maxLength={200}
          onChange={(event) => setLogo(event.target.value)}
          pattern="/assets/brand/[A-Za-z0-9._/-]+"
          required
          value={logo}
        />
        <p className="text-sm leading-6 text-muted-foreground">
          Route setup lokal hanya menerima path di bawah <code>/assets/brand/</code>.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button
          disabled={status.kind === "saving"}
          type="submit"
        >
          {status.kind === "saving" ? "Menyimpan..." : "Simpan perubahan"}
        </Button>
        <p
          aria-live="polite"
          className={
            status.kind === "error"
              ? "text-sm text-destructive"
              : status.kind === "success"
                ? "text-sm text-success"
                : "text-sm text-muted-foreground"
          }
          role="status"
        >
          {status.message}
        </p>
      </div>
    </form>
  );
}
