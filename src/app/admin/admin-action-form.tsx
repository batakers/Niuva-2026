"use client";

import { useActionState, type ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { AdminAction, AdminActionState } from "./actions";

const initialState: AdminActionState = { status: "idle" };

export function AdminActionForm({
  action,
  children,
  className,
  confirmMessage,
  successLinkLabel = "Buka tautan baru",
  submitLabel = "Simpan perubahan",
}: Readonly<{
  action: AdminAction;
  children: ReactNode;
  className?: string;
  confirmMessage?: string;
  successLinkLabel?: string;
  submitLabel?: string;
}>) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (confirmMessage !== undefined && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <fieldset className="grid gap-4" disabled={pending}>
        {children}
        <Button className="min-h-11 w-fit" disabled={pending} type="submit">
          {pending ? "Memproses…" : submitLabel}
        </Button>
      </fieldset>
      {state.status !== "idle" && state.message ? (
        <div
          aria-live="polite"
          className={`mt-4 rounded-lg border px-3 py-3 text-sm ${
            state.status === "success"
              ? "border-success-border bg-success-background text-success"
              : "border-destructive-border bg-destructive-background text-destructive"
          }`}
          role={state.status === "error" ? "alert" : "status"}
        >
          <p>{state.message}</p>
          {state.link ? (
            <Link
              className="mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
              href={state.link}
              rel="noreferrer"
              target="_blank"
            >
              {successLinkLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
