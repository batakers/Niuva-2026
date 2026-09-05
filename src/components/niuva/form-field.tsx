import * as React from "react";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
};

export type FormFieldVariant = "default" | "compact" | "readOnly";

type FormFieldControlProps =
  | {
      control: React.ReactElement;
      children?: never;
    }
  | {
      control?: never;
      children: React.ReactElement;
    };

export type FormFieldProps = {
  id: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  action?: React.ReactNode;
  variant?: FormFieldVariant;
  className?: string;
} & FormFieldControlProps;

export function FormField({
  id,
  label,
  description,
  error,
  required = false,
  disabled = false,
  action,
  control,
  children,
  variant = "default",
  className,
}: FormFieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;
  const fieldControl = control ?? children;

  if (!fieldControl) {
    return null;
  }

  const enhancedControl = React.cloneElement(
    fieldControl as React.ReactElement<FieldControlProps>,
    {
      id,
      "aria-describedby": describedBy,
      "aria-invalid": error ? true : undefined,
      disabled: disabled || undefined,
      readOnly: variant === "readOnly" || undefined,
    },
  );

  return (
    <div
      className={cn("space-y-2", variant === "compact" && "space-y-1.5", className)}
      data-component="form-field"
      data-variant={variant}
    >
      <div className="flex items-baseline justify-between gap-3">
        <Label
          className={cn(
            "text-sm font-medium",
            disabled && "cursor-not-allowed opacity-60",
          )}
          htmlFor={id}
        >
          {label}
          {required ? (
            <>
              <span aria-hidden="true" className="text-destructive">
                {" "}*
              </span>
              <span className="sr-only"> wajib</span>
            </>
          ) : null}
        </Label>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {enhancedControl}
      {description ? (
        <p className="text-xs leading-5 text-muted-foreground" id={descriptionId}>
          {description}
        </p>
      ) : null}
      {error ? (
        <p className="text-xs leading-5 text-destructive" id={errorId} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
