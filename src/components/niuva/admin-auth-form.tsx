"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { navigateAfterAdminAuth } from "./admin-auth-navigation";
import QRCode from "react-qr-code";

type Stage = "loading" | "sign-in" | "factor" | "enroll" | "setup" | "forgot" | "reset" | "forbidden";
const inputClass = "min-h-11 w-full rounded-lg border border-border bg-card px-3 text-base focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const buttonClass = "inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export async function postAdminAuth(path: string, body: Readonly<Record<string, unknown>>): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/admin/auth${path}`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data: unknown = await response.json().catch(() => { throw new Error("Layanan autentikasi belum memberikan respons yang valid. Coba lagi."); });
  if (!response.ok) {
    if (response.status === 429) throw new Error("Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.");
    if (response.status === 503) throw new Error("Layanan autentikasi atau email Admin belum tersedia.");
    if (typeof data === "object" && data !== null && "code" in data && data.code === "EMAIL_NOT_VERIFIED") throw new Error("Email belum diverifikasi. Periksa tautan verifikasi di inbox Anda sebelum masuk kembali.");
    throw new Error("Permintaan gagal. Periksa kembali data akun atau kode authenticator Anda.");
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) throw new Error("Respons login tidak dapat dibaca. Coba lagi.");
  return data as Record<string, unknown>;
}

export function AdminAuthForm({ resetToken = "", verified = false, passwordChanged = false }: Readonly<{ resetToken?: string; verified?: boolean; passwordChanged?: boolean }>) {
  const [stage, setStage] = useState<Stage>(resetToken ? "reset" : "loading");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [code, setCode] = useState("");
  const [backup, setBackup] = useState(false);
  const [saved, setSaved] = useState(false);
  const [setup, setSetup] = useState<Readonly<{ uri: string; codes: readonly string[] }> | null>(null);
  const [token, setToken] = useState(resetToken);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(passwordChanged ? "Password sudah diubah. Masuk kembali dengan password baru dan authenticator." : verified ? "Email sudah diverifikasi. Silakan masuk." : "");
  const [error, setError] = useState("");

  const fetchStatus = useCallback(async () => {
    const response = await fetch("/api/admin/auth/status", { credentials: "same-origin", cache: "no-store" });
    if (!response.ok) throw new Error("Layanan autentikasi Admin belum tersedia.");
    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null || !("stage" in data)) throw new Error("Status autentikasi tidak dapat dibaca.");
    return data.stage;
  }, []);
  function applyStatus(value: unknown) {
    if (value === "ready") { navigateAfterAdminAuth("/admin"); return; }
    setStage(value === "enroll" ? "enroll" : value === "forbidden" ? "forbidden" : "sign-in");
  }
  useEffect(() => {
    if (resetToken) {
      window.history.replaceState(null, "", "/admin/sign-in?flow=reset");
      return;
    }
    void fetchStatus().then(value => {
      if (value === "ready") { navigateAfterAdminAuth("/admin"); return; }
      setStage(value === "enroll" ? "enroll" : value === "forbidden" ? "forbidden" : "sign-in");
    }).catch((reason: unknown) => { setError(reason instanceof Error ? reason.message : "Login belum tersedia."); setStage("sign-in"); });
  }, [resetToken, fetchStatus]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(""); setMessage("");
    try {
      if (stage === "sign-in") {
        const result = await postAdminAuth("/sign-in/email", { email: email.trim(), password });
        setPassword("");
        if (result.twoFactorRedirect === true) { setCode(""); setStage("factor"); } else applyStatus(await fetchStatus());
      } else if (stage === "enroll") {
        const result = await postAdminAuth("/two-factor/enable", { password });
        setPassword("");
        if (typeof result.totpURI !== "string" || !Array.isArray(result.backupCodes) || !result.backupCodes.every((value: unknown) => typeof value === "string")) throw new Error("Setup authenticator tidak dapat dibaca.");
        setSetup({ uri: result.totpURI, codes: result.backupCodes as string[] }); setSaved(false); setStage("setup");
      } else if (stage === "factor" || stage === "setup") {
        if (stage === "setup" && !saved) throw new Error("Simpan kode pemulihan sebelum melanjutkan.");
        await postAdminAuth(backup && stage === "factor" ? "/two-factor/verify-backup-code" : "/two-factor/verify-totp", { code: code.trim(), trustDevice: false });
        setCode(""); setSetup(null); applyStatus(await fetchStatus());
      } else if (stage === "forgot") {
        await postAdminAuth("/request-password-reset", { email: email.trim() });
        setMessage("Jika email terdaftar sebagai Admin, tautan pemulihan akan dikirim. Periksa inbox dan spam.");
      } else if (stage === "reset") {
        if (password !== confirmation) throw new Error("Konfirmasi password belum sama.");
        await postAdminAuth("/reset-password", { token, newPassword: password });
        setPassword(""); setConfirmation(""); setToken(""); setStage("sign-in");
        setMessage("Password sudah diubah. Masuk kembali dengan password baru dan authenticator.");
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Login gagal. Coba lagi."); } finally { setBusy(false); }
  }

  async function leave() {
    setBusy(true);
    try { await postAdminAuth("/sign-out", {}); setSetup(null); setPassword(""); setCode(""); navigateAfterAdminAuth("/admin/sign-in"); } catch (reason) { setError(reason instanceof Error ? reason.message : "Logout gagal."); } finally { setBusy(false); }
  }
  if (stage === "loading") return <p role="status">Memeriksa sesi Admin…</p>;
  return <form className="space-y-5" onSubmit={submit} aria-busy={busy}>
    <h2 className="text-xl font-semibold">{stage === "factor" ? "Verifikasi login" : stage === "enroll" || stage === "setup" ? "Aktifkan authenticator" : stage === "forgot" ? "Pulihkan password" : stage === "reset" ? "Password baru" : stage === "forbidden" ? "Akses belum diaktifkan" : "Masuk Admin"}</h2>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    {stage === "forbidden" && <p className="text-sm text-muted-foreground">Hubungi Owner untuk memeriksa profil dan akses Admin Anda.</p>}
    {(stage === "sign-in" || stage === "forgot") && <label className="block space-y-2"><span className="text-sm font-medium">Email Admin</span><input className={inputClass} name="email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy}/></label>}
    {(stage === "sign-in" || stage === "enroll" || stage === "reset") && <label className="block space-y-2"><span className="text-sm font-medium">{stage === "reset" ? "Password baru" : "Password"}</span><input className={inputClass} name="password" type="password" autoComplete={stage === "reset" ? "new-password" : "current-password"} minLength={stage === "sign-in" ? 1 : 12} maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} disabled={busy}/></label>}
    {stage === "enroll" && <p className="text-sm leading-6 text-muted-foreground">Masukkan kembali password untuk menyiapkan authenticator. Dashboard akan terbuka setelah kode pertama diverifikasi.</p>}
    {stage === "reset" && <label className="block space-y-2"><span className="text-sm font-medium">Konfirmasi password baru</span><input className={inputClass} type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy}/></label>}
    {stage === "setup" && setup && <div className="space-y-4">
      <p className="text-sm leading-6 text-muted-foreground">Pindai QR menggunakan aplikasi authenticator Anda. Simpan kode pemulihan di tempat pribadi; setiap kode hanya dapat digunakan sekali.</p>
      <div className="inline-block rounded-lg bg-white p-4"><QRCode value={setup.uri} size={176} title="QR untuk menambahkan akun NIUVA Admin ke authenticator"/></div>
      <details className="text-sm"><summary className="cursor-pointer py-3">Tidak bisa memindai QR?</summary><p className="break-all py-2">Tambahkan akun secara manual: {new URL(setup.uri).searchParams.get("secret")}</p></details>
      <div className="rounded-lg border border-border bg-muted p-4"><p className="mb-3 text-sm font-semibold">Kode pemulihan</p><ul className="grid grid-cols-2 gap-2 text-sm font-mono">{setup.codes.map(value => <li key={value}>{value}</li>)}</ul></div>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)} required disabled={busy}/>Saya sudah menyimpan kode pemulihan</label>
    </div>}
    {(stage === "factor" || stage === "setup") && <label className="block space-y-2"><span className="text-sm font-medium">{backup && stage === "factor" ? "Kode pemulihan" : "Kode authenticator"}</span><input className={inputClass} name="code" type="text" inputMode={backup ? "text" : "numeric"} autoComplete="one-time-code" pattern={backup ? undefined : "[0-9]{6}"} maxLength={backup ? 64 : 6} required value={code} onChange={event => setCode(event.target.value)} disabled={busy}/></label>}
    {stage !== "forbidden" && <button className={buttonClass + " w-full"} disabled={busy || (stage === "setup" && !saved)} type="submit">{busy ? "Memproses…" : stage === "enroll" ? "Siapkan authenticator" : stage === "factor" || stage === "setup" ? "Verifikasi kode" : stage === "forgot" ? "Kirim tautan pemulihan" : stage === "reset" ? "Simpan password" : "Masuk"}</button>}
    <div className="flex flex-wrap gap-3 text-sm">
      {stage === "sign-in" && <button className="min-h-11 underline underline-offset-4" type="button" onClick={() => { setError(""); setStage("forgot"); }} disabled={busy}>Lupa password?</button>}
      {stage === "factor" && <button className="min-h-11 underline underline-offset-4" type="button" onClick={() => { setBackup(!backup); setCode(""); setError(""); }} disabled={busy}>{backup ? "Gunakan authenticator" : "Gunakan kode pemulihan"}</button>}
      {stage === "forgot" && <button className="min-h-11 underline underline-offset-4" type="button" onClick={() => { setError(""); setStage("sign-in"); }} disabled={busy}>Kembali ke login</button>}
      {["factor", "enroll", "setup", "forbidden"].includes(stage) && <button className="min-h-11 underline underline-offset-4" type="button" onClick={() => void leave()} disabled={busy}>Keluar dari sesi ini</button>}
    </div>
  </form>;
}
