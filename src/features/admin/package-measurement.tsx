"use client";

import { useState } from "react";

import { StatusNotice } from "@/components/niuva/status-notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type PackageMeasurementValues = Readonly<{
  finalHeightCm: string;
  finalLengthCm: string;
  finalWeightGrams: string;
  finalWidthCm: string;
}>;

type PackageMeasurementErrors = Partial<Record<keyof PackageMeasurementValues, string>>;

type PackageMeasurementProps = Readonly<{
  disabled: boolean;
  onValidated: (measurement: PackageMeasurementValues) => void;
}>;

const fields: readonly Readonly<{
  id: keyof PackageMeasurementValues;
  label: string;
  suffix: string;
}>[] = [
  { id: "finalLengthCm", label: "Panjang akhir", suffix: "cm" },
  { id: "finalWidthCm", label: "Lebar akhir", suffix: "cm" },
  { id: "finalHeightCm", label: "Tinggi akhir", suffix: "cm" },
  { id: "finalWeightGrams", label: "Berat akhir", suffix: "g" },
];

const initialValues: PackageMeasurementValues = {
  finalHeightCm: "",
  finalLengthCm: "",
  finalWeightGrams: "",
  finalWidthCm: "",
};

export function validatePackageMeasurement(
  values: PackageMeasurementValues,
): PackageMeasurementErrors {
  return fields.reduce<PackageMeasurementErrors>((errors, field) => {
    const value = values[field.id].trim();
    const numericValue = Number(value);

    if (!/^\d+(?:\.\d{1,6})?$/.test(value) || !Number.isFinite(numericValue) || numericValue <= 0) {
      errors[field.id] = `${field.label} harus berupa angka lebih dari 0.`;
    }

    return errors;
  }, {});
}

export function PackageMeasurement({ disabled, onValidated }: PackageMeasurementProps) {
  const [errors, setErrors] = useState<PackageMeasurementErrors>({});
  const [values, setValues] = useState<PackageMeasurementValues>(initialValues);

  function updateValue(field: keyof PackageMeasurementValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function validatePreviewMeasurement() {
    const nextErrors = validatePackageMeasurement(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      onValidated(values);
    }
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <section aria-labelledby="package-measurement-heading" className="border-t border-border pt-6">
      <div>
        <h3 className="text-sm font-semibold" id="package-measurement-heading">Pengukuran paket akhir</h3>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Shipping custom tidak dapat disiapkan sebelum panjang, lebar, tinggi, dan berat akhir divalidasi.
        </p>
      </div>

      {hasErrors ? (
        <StatusNotice
          className="mt-4"
          description="Lengkapi empat ukuran akhir. Tidak ada rate, shipment, atau payment provider yang dipanggil dari preview."
          role="alert"
          size="compact"
          title="Pengukuran paket belum lengkap"
          tone="error"
        />
      ) : null}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {fields.map((field) => {
          const error = errors[field.id];
          const descriptionId = error ? `${field.id}-error` : undefined;

          return (
            <div className="grid gap-2" key={field.id}>
              <label className="text-sm font-medium" htmlFor={field.id}>{field.label} ({field.suffix})</label>
              <Input
                aria-describedby={descriptionId}
                aria-invalid={error ? "true" : undefined}
                disabled={disabled}
                id={field.id}
                inputMode="decimal"
                onChange={(event) => updateValue(field.id, event.target.value)}
                placeholder="Contoh: 12.5"
                type="text"
                value={values[field.id]}
              />
              {error ? <p className="text-sm text-destructive" id={descriptionId} role="alert">{error}</p> : null}
            </div>
          );
        })}
      </div>

      <Button
        className="mt-5 min-h-11 cursor-pointer"
        disabled={disabled}
        onClick={validatePreviewMeasurement}
        type="button"
        variant="outline"
      >
        Validasi pengukuran preview
      </Button>
    </section>
  );
}
