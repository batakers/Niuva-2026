"use client";

import { FieldSet } from "@/components/ui/field";
import { createContext, useActionState, useContext, useState, type ReactNode } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { AdminAction, AdminActionState } from "./actions";

const initialState: AdminActionState = { status: "idle" };
const FormBusyContext = createContext<(busy: boolean) => void>(() => {});
export function useAdminFormBusy() { return useContext(FormBusyContext); }

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
  const [busy, setBusy] = useState(false);

  return (
    <form
      action={formAction}
      className={className}
      onSubmit={(event) => {
        if (busy) { event.preventDefault(); return; }
        if (confirmMessage !== undefined && !window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <FieldSet className="grid gap-4" disabled={pending || busy}>
        <FormBusyContext value={setBusy}>{children}</FormBusyContext>
        <Button className="min-h-11 w-fit" disabled={pending || busy} type="submit">
          {busy ? "Menunggu foto…" : pending ? "Memproses…" : submitLabel}
        </Button>
      </FieldSet>
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
