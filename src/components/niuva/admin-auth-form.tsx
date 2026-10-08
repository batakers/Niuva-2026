"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useHydrated } from "./use-hydrated";
import { typographySystemTokens } from "@/design/typography";
import { navigateAfterAdminAuth } from "./admin-auth-navigation";
import QRCode from "react-qr-code";
import { ADMIN_PASSWORD_MIN_LENGTH, ADMIN_PASSWORD_MAX_LENGTH, ADMIN_EXISTING_PASSWORD_MAX_LENGTH } from "@/modules/admin-auth/password-policy";

type Stage = "loading" | "sign-in" | "factor" | "enroll" | "setup" | "forgot" | "reset" | "invitation" | "forbidden";
const focusClass = "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card";
const inputClass = `min-h-11 w-full rounded-lg border border-input bg-background px-3 py-2.5 text-base caret-primary disabled:cursor-wait disabled:opacity-60 ${focusClass}`;
const buttonClass = `inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors duration-150 hover:bg-brand-800 active:bg-brand-900 disabled:cursor-wait disabled:opacity-50 motion-reduce:transition-none ${focusClass}`;
const secondaryButtonClass = `min-h-11 rounded-lg text-sm font-medium text-primary underline underline-offset-4 transition-colors duration-150 hover:text-brand-900 disabled:opacity-50 motion-reduce:transition-none ${focusClass}`;

export async function postAdminAuth(path: string, body: Readonly<Record<string, unknown>>): Promise<Record<string, unknown>> {
  const response = await fetch(`/api/admin/auth${path}`, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data: unknown = await response.json().catch(() => { throw new Error("Layanan autentikasi belum memberikan respons yang valid. Coba lagi."); });
  if (!response.ok) {
    const errorCode = typeof data === "object" && data !== null && "code" in data ? data.code
      : typeof data === "object" && data !== null && "error" in data && typeof data.error === "object" && data.error !== null && "code" in data.error ? data.error.code : undefined;
    if (response.status === 429) throw new Error("Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.");
    if (response.status === 503) throw new Error("Layanan autentikasi atau email Admin belum tersedia.");
    if (path === "/accept-invitation") throw new Error("Undangan tidak berlaku atau sudah digunakan. Minta Owner mengirim undangan baru.");
    if (errorCode === "EMAIL_NOT_VERIFIED") throw new Error("Email belum diverifikasi. Periksa tautan verifikasi di inbox Anda sebelum masuk kembali.");
    if (path === "/sign-in/email" && ["FORBIDDEN", "INVALID_ORIGIN", "INVALID_CALLBACK_URL"].includes(typeof errorCode === "string" ? errorCode : "")) throw new Error("Alamat halaman login tidak sesuai dengan konfigurasi Niuva. Buka kembali halaman login dari alamat aplikasi yang benar.");
    throw new Error("Permintaan gagal. Periksa kembali data akun atau kode authenticator Anda.");
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) throw new Error("Respons login tidak dapat dibaca. Coba lagi.");
  return data as Record<string, unknown>;
}

export function AdminAuthForm({ resetToken = "", invitation = false, verified = false, passwordChanged = false }: Readonly<{ resetToken?: string; invitation?: boolean; verified?: boolean; passwordChanged?: boolean }>) {
  const hydrated = useHydrated();
  const [stage, setStage] = useState<Stage>(invitation ? "invitation" : resetToken ? "reset" : "loading");
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
  const invitationLoaded = useRef(false);

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
    if (invitation) {
      if (invitationLoaded.current) return;
      invitationLoaded.current = true;
      const invitationToken = new URLSearchParams(window.location.hash.slice(1)).get("token") ?? "";
      queueMicrotask(() => {
        setToken(/^[A-Za-z0-9_-]{43}$/.test(invitationToken) ? invitationToken : "");
        if (!/^[A-Za-z0-9_-]{43}$/.test(invitationToken)) setError("Tautan undangan tidak lengkap. Buka kembali tautan dari email Anda.");
      });
      window.history.replaceState(null, "", "/admin/sign-in?flow=invite");
      return;
    }
    if (resetToken) {
      window.history.replaceState(null, "", "/admin/sign-in?flow=reset");
      return;
    }
    void fetchStatus().then(value => {
      if (value === "ready") { navigateAfterAdminAuth("/admin"); return; }
      setStage(value === "enroll" ? "enroll" : value === "forbidden" ? "forbidden" : "sign-in");
    }).catch((reason: unknown) => { setError(reason instanceof Error ? reason.message : "Login belum tersedia."); setStage("sign-in"); });
  }, [resetToken, invitation, fetchStatus]);

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
      } else if (stage === "reset" || stage === "invitation") {
        if (password !== confirmation) throw new Error("Konfirmasi password belum sama.");
        await postAdminAuth(stage === "invitation" ? "/accept-invitation" : "/reset-password", stage === "invitation" ? { token, password } : { token, newPassword: password });
        setPassword(""); setConfirmation(""); setToken(""); setStage("sign-in");
        setMessage(stage === "invitation" ? "Akun Admin sudah aktif. Masuk dengan email undangan dan password Anda, lalu aktifkan authenticator." : "Password sudah diubah. Masuk kembali dengan password baru dan authenticator.");
      }
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Login gagal. Coba lagi."); } finally { setBusy(false); }
  }

  async function leave() {
    setBusy(true);
    try { await postAdminAuth("/sign-out", {}); setSetup(null); setPassword(""); setCode(""); navigateAfterAdminAuth("/admin/sign-in"); } catch (reason) { setError(reason instanceof Error ? reason.message : "Logout gagal."); } finally { setBusy(false); }
  }
  if (stage === "loading") return <div aria-busy="true" className="min-h-80 space-y-6"><h1 className={typographySystemTokens.heading.className}>Masuk Admin</h1><p className="text-base leading-6 text-muted-foreground" role="status">Memeriksa sesi Admin…</p></div>;
  return <form className="space-y-6" onSubmit={submit} aria-busy={busy}>
    <div className="space-y-3">
      <h1 className={typographySystemTokens.heading.className}>{stage === "factor" ? "Verifikasi login" : stage === "enroll" || stage === "setup" ? "Aktifkan authenticator" : stage === "forgot" ? "Pulihkan password" : stage === "reset" ? "Password baru" : stage === "invitation" ? "Aktifkan akun Admin" : stage === "forbidden" ? "Akses belum diaktifkan" : "Masuk Admin"}</h1>
      {stage === "sign-in" && <p className="text-base leading-6 text-muted-foreground">Gunakan akun Owner atau Admin yang sudah diaktifkan.</p>}
      {stage === "invitation" && <p className="text-base leading-6 text-muted-foreground">Buat password pribadi sepanjang 8–15 karakter. Setelah masuk, Anda akan menyiapkan authenticator.</p>}
    </div>
    {error && <p role="alert" className="rounded-lg border border-destructive-border bg-destructive-background px-3 py-3 text-sm leading-6 text-destructive-icon">{error}</p>}
    {message && <p role="status" className="rounded-lg border border-info-border bg-info-background px-3 py-3 text-sm leading-6 text-info-icon">{message}</p>}
    {stage === "forbidden" && <p className="text-sm text-muted-foreground">Hubungi Owner untuk memeriksa profil dan akses Admin Anda.</p>}
    {(stage === "sign-in" || stage === "forgot") && <label className="block space-y-2"><span className="text-sm font-medium">Email Admin</span><input className={inputClass} name="email" type="email" autoComplete="username" required maxLength={254} value={email} onChange={event => setEmail(event.target.value)} disabled={busy || !hydrated}/></label>}
    {(stage === "sign-in" || stage === "enroll" || stage === "reset" || stage === "invitation") && <label className="block space-y-2"><span className="text-sm font-medium">{stage === "reset" || stage === "invitation" ? "Password baru" : "Password"}</span><input className={inputClass} name="password" type="password" autoComplete={stage === "reset" || stage === "invitation" ? "new-password" : "current-password"} minLength={stage === "reset" || stage === "invitation" ? ADMIN_PASSWORD_MIN_LENGTH : 1} maxLength={stage === "reset" || stage === "invitation" ? ADMIN_PASSWORD_MAX_LENGTH : ADMIN_EXISTING_PASSWORD_MAX_LENGTH} required value={password} onChange={event => setPassword(event.target.value)} disabled={busy || !hydrated}/></label>}
    {stage === "enroll" && <p className="text-sm leading-6 text-muted-foreground">Masukkan kembali password untuk menyiapkan authenticator. Dashboard akan terbuka setelah kode pertama diverifikasi.</p>}
    {(stage === "reset" || stage === "invitation") && <label className="block space-y-2"><span className="text-sm font-medium">Konfirmasi password baru</span><input className={inputClass} type="password" autoComplete="new-password" minLength={ADMIN_PASSWORD_MIN_LENGTH} maxLength={ADMIN_PASSWORD_MAX_LENGTH} required value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy || !hydrated}/></label>}
    {stage === "setup" && setup && <div className="space-y-4">
      <p className="text-sm leading-6 text-muted-foreground">Pindai QR menggunakan aplikasi authenticator Anda. Simpan kode pemulihan di tempat pribadi; setiap kode hanya dapat digunakan sekali.</p>
      <div className="inline-block rounded-lg bg-white p-4"><QRCode value={setup.uri} size={176} title="QR untuk menambahkan akun NIUVA Admin ke authenticator"/></div>
      <details className="text-sm"><summary className="cursor-pointer py-3">Tidak bisa memindai QR?</summary><p className="break-all py-2">Tambahkan akun secara manual: {new URL(setup.uri).searchParams.get("secret")}</p></details>
      <div className="rounded-lg border border-border bg-muted p-4"><p className="mb-3 text-sm font-semibold">Kode pemulihan</p><ul className="grid grid-cols-2 gap-2 text-sm font-mono">{setup.codes.map(value => <li key={value}>{value}</li>)}</ul></div>
      <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={saved} onChange={event => setSaved(event.target.checked)} required disabled={busy || !hydrated}/>Saya sudah menyimpan kode pemulihan</label>
    </div>}
    {(stage === "factor" || stage === "setup") && <label className="block space-y-2"><span className="text-sm font-medium">{backup && stage === "factor" ? "Kode pemulihan" : "Kode authenticator"}</span><input className={inputClass} name="code" type="text" inputMode={backup ? "text" : "numeric"} autoComplete="one-time-code" pattern={backup ? undefined : "[0-9]{6}"} maxLength={backup ? 64 : 6} required value={code} onChange={event => setCode(event.target.value)} disabled={busy || !hydrated}/></label>}
    {stage !== "forbidden" && <button className={buttonClass + " w-full"} disabled={busy || !hydrated || (stage === "setup" && !saved) || (stage === "invitation" && !token)} type="submit">{busy ? "Memproses…" : stage === "enroll" ? "Siapkan authenticator" : stage === "factor" || stage === "setup" ? "Verifikasi kode" : stage === "forgot" ? "Kirim tautan pemulihan" : stage === "reset" ? "Simpan password" : stage === "invitation" ? "Aktifkan akun" : "Masuk"}</button>}
    <div className="flex flex-wrap gap-3 text-sm">
      {stage === "sign-in" && <button className={secondaryButtonClass} type="button" onClick={() => { setError(""); setStage("forgot"); }} disabled={busy || !hydrated}>Lupa password?</button>}
      {stage === "factor" && <button className={secondaryButtonClass} type="button" onClick={() => { setBackup(!backup); setCode(""); setError(""); }} disabled={busy || !hydrated}>{backup ? "Gunakan authenticator" : "Gunakan kode pemulihan"}</button>}
      {(stage === "forgot" || stage === "invitation") && <button className={secondaryButtonClass} type="button" onClick={() => { setError(""); setPassword(""); setConfirmation(""); setToken(""); setStage("sign-in"); }} disabled={busy || !hydrated}>Kembali ke login</button>}
      {["factor", "enroll", "setup", "forbidden"].includes(stage) && <button className={secondaryButtonClass} type="button" onClick={() => void leave()} disabled={busy || !hydrated}>Keluar dari sesi ini</button>}
    </div>
  </form>;
}
