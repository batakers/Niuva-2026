import * as React from "react";

import { cn } from "@/lib/utils";

type FieldControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  disabled?: boolean;
};

export type FormFieldProps = {
  id: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  action?: React.ReactNode;
  children: React.ReactElement;
  className?: string;
};

export function FormField({
  id,
  label,
  description,
  error,
  required = false,
  disabled = false,
  action,
  children,
  className,
}: FormFieldProps) {
  const descriptionId = description ? `${id}-description` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(" ") || undefined;
  const control = React.cloneElement(
    children as React.ReactElement<FieldControlProps>,
    {
      id,
      "aria-describedby": describedBy,
      "aria-invalid": error ? true : undefined,
      disabled: disabled || undefined,
    },
  );

  return (
    <div className={cn("space-y-2", className)} data-component="form-field">
      <div className="flex items-baseline justify-between gap-3">
        <label
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
        </label>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {control}
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
