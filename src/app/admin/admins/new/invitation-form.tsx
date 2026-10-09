"use client";

import { FieldSet, FieldLegend } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { NativeInput as Input } from "@/components/ui/input";
import { useActionState, useState } from "react";
import { Check, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { inviteAdminAction, type AdminInvitationState } from "./actions";

const initial: AdminInvitationState = { status: "idle" };
const inputClass = "min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base caret-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:opacity-60";

export function AdminInvitationForm({ mailReady }: Readonly<{ mailReady: boolean }>) {
  const [generation, setGeneration] = useState(0);
  return <InvitationForm key={generation} mailReady={mailReady} onNew={() => setGeneration(value => value + 1)} />;
}
function InvitationForm({ mailReady, onNew }: Readonly<{ mailReady: boolean; onNew: () => void }>) {
  const [state, action, pending] = useActionState(inviteAdminAction, initial);
  if (state.status === "success") return <div className="space-y-6">
    <div role="status" className="space-y-3">
      <Check aria-hidden="true" className="size-6 text-success-icon" />
      <h2 className="text-xl font-semibold">Undangan sudah dikirim</h2>
      <p className="break-words leading-6 text-muted-foreground">Minta penerima memeriksa inbox atau spam di <strong className="font-medium text-foreground">{state.email}</strong>. Tautan berlaku selama 30 menit.</p>
      <p className="text-sm leading-6 text-muted-foreground">Akses Dashboard terbuka setelah penerima membuat password dan memverifikasi authenticator.</p>
    </div>
    <Button type="button" variant="outline" onClick={onNew}>Tambah Admin lain</Button>
  </div>;
  return <form action={action} aria-busy={pending} className="space-y-6">
    {state.status === "error" && <p role="alert" className="rounded-lg border border-destructive-border bg-destructive-background p-4 text-sm leading-6 text-destructive-icon">{state.message}</p>}
    <FieldSet disabled={pending || !mailReady} className="space-y-6">
      <FieldLegend className="sr-only">Identitas Admin yang diundang</FieldLegend>
      <Label className="grid gap-2 block space-y-2" htmlFor="admin-display-name"><span className="text-sm font-medium">Nama Admin</span><Input className={inputClass} id="admin-display-name" name="displayName" autoComplete="name" maxLength={100} required /><span className="block text-sm leading-5 text-muted-foreground">Nama yang digunakan untuk mengenali operator.</span></Label>
      <Label className="grid gap-2 block space-y-2" htmlFor="admin-invitation-email"><span className="text-sm font-medium">Email Admin</span><Input className={inputClass} id="admin-invitation-email" name="email" type="email" autoComplete="email" maxLength={254} required /><span className="block text-sm leading-5 text-muted-foreground">Undangan dikirim ke alamat ini. Gunakan email milik penerima.</span></Label>
      <div className="flex items-start justify-between gap-4 border-y border-border py-4"><div><p className="text-sm font-medium">Peran akun</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Mengelola operasi BUY, MAKE, dan DEVELOP.</p></div><span className="rounded-full border border-border bg-muted px-3 py-1 text-sm font-medium">Admin</span></div>
      <Button type="submit" className="w-full sm:w-auto"><Mail aria-hidden="true" className="size-4" />{pending ? "Mengirim undangan…" : "Kirim undangan"}</Button>
    </FieldSet>
    <p className="text-xs leading-5 text-muted-foreground">Penerima membuat passwordnya sendiri. Tautan undangan hanya dapat digunakan sekali.</p>
  </form>;
}
