"use client";
import { useState, type FormEvent } from "react";
import { postAdminAuth } from "./admin-auth-form";
import { navigateAfterAdminAuth } from "./admin-auth-navigation";
import { useHydrated } from "./use-hydrated";
import { ADMIN_PASSWORD_MIN_LENGTH, ADMIN_PASSWORD_MAX_LENGTH } from "@/modules/admin-auth/password-policy";

export function AdminSecurityForm() {
  const hydrated = useHydrated();
  const [password, setPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [codes, setCodes] = useState<readonly string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function run(kind: "password" | "codes") {
    if (busy || !hydrated) return;
    setBusy(true); setError(""); setMessage(""); setCodes([]);
    try {
      if (kind === "password") {
        if (nextPassword !== confirmation) throw new Error("Konfirmasi password belum sama.");
        await postAdminAuth("/change-password", { currentPassword: password, newPassword: nextPassword });
        setNextPassword(""); setConfirmation("");
        navigateAfterAdminAuth("/admin/sign-in?flow=password-updated");
      } else {
        const result = await postAdminAuth("/two-factor/generate-backup-codes", { password });
        if (!Array.isArray(result.backupCodes) || !result.backupCodes.every((value: unknown) => typeof value === "string")) throw new Error("Kode pemulihan tidak dapat dibaca.");
        setCodes(result.backupCodes as string[]); setMessage("Simpan kode baru. Kode pemulihan sebelumnya sudah tidak berlaku.");
      }
      setPassword("");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Permintaan gagal."); }
    finally { setBusy(false); }
  }
  function submit(event: FormEvent) { event.preventDefault(); void run("password"); }
  const inputClass = "min-h-11 w-full rounded-lg border border-border bg-card px-3 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
  return <form className="max-w-lg space-y-5" onSubmit={submit} aria-busy={busy}>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    <label className="block space-y-2"><span className="text-sm font-medium">Password saat ini</span><input className={inputClass} type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={event => setPassword(event.target.value)} disabled={busy || !hydrated}/></label>
    <label className="block space-y-2"><span className="text-sm font-medium">Password baru</span><input className={inputClass} type="password" autoComplete="new-password" required minLength={ADMIN_PASSWORD_MIN_LENGTH} maxLength={ADMIN_PASSWORD_MAX_LENGTH} value={nextPassword} onChange={event => setNextPassword(event.target.value)} disabled={busy || !hydrated}/></label>
    <label className="block space-y-2"><span className="text-sm font-medium">Konfirmasi password baru</span><input className={inputClass} type="password" autoComplete="new-password" required minLength={ADMIN_PASSWORD_MIN_LENGTH} maxLength={ADMIN_PASSWORD_MAX_LENGTH} value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy || !hydrated}/></label>
    <button className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50" type="submit" disabled={busy || !hydrated}>Ubah password</button>
    <div className="space-y-4 border-t border-border pt-5">
      <h2 className="text-lg font-semibold">Kode pemulihan</h2>
      <p className="text-sm leading-6 text-muted-foreground">Masukkan password saat ini sebelum membuat kode pemulihan baru. Kode lama akan dicabut; authenticator tetap aktif.</p>
      <button className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50" type="button" disabled={busy || !hydrated || !password} onClick={() => void run("codes")}>Buat kode pemulihan baru</button>
      {codes.length > 0 && <ul aria-label="Kode pemulihan baru" className="grid grid-cols-2 gap-2 rounded-lg bg-muted p-4 font-mono text-sm">{codes.map(code => <li key={code}>{code}</li>)}</ul>}
    </div>
  </form>;
}
