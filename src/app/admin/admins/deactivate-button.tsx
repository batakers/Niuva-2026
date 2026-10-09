"use client";

import { Button } from "@/components/ui/button";
import { useActionState, useState } from "react";
import { useHydrated } from "@/components/niuva/use-hydrated";
import { deactivateAdminAction, type DeactivateAdminState } from "./actions";

const initial: DeactivateAdminState = { status: "idle" };

export function DeactivateAdminButton({ adminId, displayName }: Readonly<{ adminId: string; displayName: string }>) {
  const [confirming, setConfirming] = useState(false);
  const hydrated = useHydrated();
  const [state, action, pending] = useActionState(deactivateAdminAction, initial);
  if (state.status === "success") return <p role="status" className="text-xs font-medium text-success-icon">{state.message}</p>;
  return <div className="space-y-2">
    {confirming ? <form action={action} className="flex flex-wrap items-center gap-2">
      <input name="adminId" type="hidden" value={adminId} />
      <span className="text-xs text-muted-foreground">Cabut akses {displayName}?</span>
      <Button variant="destructive" disabled={pending} type="submit" className="min-h-11 rounded-lg border border-destructive-border bg-destructive-background px-3 text-xs font-semibold text-destructive-icon focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">{pending ? "Memproses…" : "Ya, nonaktifkan"}</Button>
      <Button variant="outline" disabled={pending} onClick={() => setConfirming(false)} type="button" className="min-h-11 rounded-lg border border-border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50">Batal</Button>
    </form> : <Button variant="destructive" disabled={!hydrated} onClick={() => setConfirming(true)} type="button" className="min-h-11 rounded-lg border border-border px-3 text-xs font-semibold text-destructive-icon hover:bg-destructive-background focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50">Nonaktifkan</Button>}
    {state.status === "error" ? <p role="alert" className="text-xs text-destructive-icon">{state.message}</p> : null}
  </div>;
}
