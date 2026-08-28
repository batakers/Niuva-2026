"use client";

import { useId } from "react";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

export type VariantSelectorVariant = "swatch" | "list" | "radio";
export type VariantSelectorSize = "default" | "compact";
export type VariantAvailability = "available" | "out-of-stock" | "loading" | "revalidated";
export type VariantSwatchTone = "brand" | "neutral" | "contrast";

export type VariantOption = {
  id: string;
  label: string;
  detail?: string;
  price?: string;
  availability?: VariantAvailability;
  swatchTone?: VariantSwatchTone;
};

export type VariantSelectorProps = {
  label: string;
  options: readonly VariantOption[];
  selectedId?: string;
  defaultSelectedId?: string;
  onChange?: (optionId: string) => void;
  description?: string;
  error?: string;
  name?: string;
  variant?: VariantSelectorVariant;
  size?: VariantSelectorSize;
  disabled?: boolean;
  id?: string;
  className?: string;
};

const availabilityLabels: Record<VariantAvailability, string> = {
  available: "Tersedia",
  "out-of-stock": "Stok habis",
  loading: "Memuat ketersediaan",
  revalidated: "Ketersediaan berubah",
};

const availabilityClasses: Record<VariantAvailability, string> = {
  available: "text-success",
  "out-of-stock": "text-destructive",
  loading: "text-muted-foreground",
  revalidated: "text-warning",
};

const swatchClasses: Record<VariantSwatchTone, string> = {
  brand: "bg-brand-300",
  neutral: "bg-neutral-200",
  contrast: "bg-neutral-900",
};

function isOptionDisabled(option: VariantOption, disabled: boolean) {
  return (
    disabled || option.availability === "out-of-stock" || option.availability === "loading"
  );
}

export function VariantSelector({
  label,
  options,
  selectedId,
  defaultSelectedId,
  onChange,
  description,
  error,
  name,
  variant = "radio",
  size = "default",
  disabled = false,
  id,
  className,
}: VariantSelectorProps) {
  const generatedId = useId().replace(/:/g, "");
  const groupId = id ?? `variant-selector-${generatedId}`;
  const labelId = `${groupId}-label`;
  const descriptionId = description ? `${groupId}-description` : undefined;
  const errorId = error ? `${groupId}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;

  const groupLayout = {
    swatch: "grid gap-3 sm:grid-cols-2",
    list: "gap-0 overflow-hidden rounded-xl border border-border",
    radio: "grid gap-2",
  }[variant];

  return (
    <fieldset
      className={cn("min-w-0 space-y-3", className)}
      data-component="variant-selector"
      data-size={size}
      data-variant={variant}
      disabled={disabled}
    >
      <legend className="text-sm font-medium" id={labelId}>
        {label}
      </legend>
      {description ? (
        <p className="text-xs leading-5 text-muted-foreground" id={descriptionId}>
          {description}
        </p>
      ) : null}

      <RadioGroup
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
        aria-labelledby={labelId}
        className={groupLayout}
        defaultValue={defaultSelectedId}
        name={name ?? groupId}
        onValueChange={(value: string) => onChange?.(value)}
        value={selectedId}
      >
        {options.map((option, index) => {
          const optionDisabled = isOptionDisabled(option, disabled);
          const availability = option.availability ?? "available";
          const optionId = `${groupId}-option-${index}`;

          return (
            <div
              className={cn(
                "group/variant flex min-w-0 items-start gap-3 border border-border bg-background p-3 transition-colors has-data-[checked]:border-primary has-data-[checked]:bg-brand-50 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
                variant !== "list" && "rounded-xl",
                variant === "list" && "rounded-none border-x-0 border-t-0 first:rounded-t-xl last:rounded-b-xl last:border-b-0",
                size === "compact" && "p-2.5",
                optionDisabled && "cursor-not-allowed bg-muted/50 opacity-70",
              )}
              data-availability={availability}
              key={option.id}
            >
              <RadioGroupItem
                aria-invalid={error ? true : undefined}
                disabled={optionDisabled}
                id={optionId}
                value={option.id}
                className="mt-0.5"
              />
              {variant === "swatch" ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 size-7 shrink-0 rounded-md border border-border",
                    swatchClasses[option.swatchTone ?? "neutral"],
                  )}
                />
              ) : null}
              <label className="min-w-0 flex-1 cursor-pointer" htmlFor={optionId}>
                <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="text-sm font-medium text-foreground">{option.label}</span>
                  {option.price ? (
                    <span className="font-mono text-xs text-foreground">{option.price}</span>
                  ) : null}
                </span>
                {option.detail ? (
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    {option.detail}
                  </span>
                ) : null}
                {availability !== "available" ? (
                  <span className={cn("mt-1 block text-xs", availabilityClasses[availability])}>
                    {" "}
                    {availabilityLabels[availability]}
                  </span>
                ) : null}
              </label>
            </div>
          );
        })}
      </RadioGroup>

      {error ? (
        <p className="text-xs leading-5 text-destructive" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
