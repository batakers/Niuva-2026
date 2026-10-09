"use client";

import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { postAdminAuth } from "./admin-auth-form";
import { navigateAfterAdminAuth } from "./admin-auth-navigation";
import { useHydrated } from "./use-hydrated";
import Link from "next/link";

export function AdminSessionActions({
  dark = false,
  showLogout = false,
  retryHref,
}: Readonly<{ dark?: boolean; retryHref?: string; showLogout?: boolean }>) {
  const buttonClassName = dark
    ? "border-neutral-600 text-neutral-200 hover:border-neutral-300 hover:text-neutral-50"
    : "border-border text-foreground hover:border-brand-400";
  const [busy, setBusy] = useState(false);
  const hydrated = useHydrated();
  const [error, setError] = useState("");
  async function logout() {
    setBusy(true); setError("");
    try { await postAdminAuth("/sign-out", {}); navigateAfterAdminAuth("/admin/sign-in"); }
    catch { setError("Logout belum berhasil. Coba lagi."); setBusy(false); }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {retryHref ? (
        <Link
          className={buttonVariants({ variant: "outline", className: "inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-semibold hover:border-brand-400 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" })}
          href={retryHref}
        >
          Muat ulang
        </Link>
      ) : null}
      {showLogout ? (
        <>
          <Link className={buttonVariants({ variant: "outline", className: "inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50" })} href="/admin/security">Keamanan akun</Link>
          <Button variant="ghost"
            className={`inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${buttonClassName}`}
            type="button"
            disabled={busy || !hydrated}
            onClick={() => void logout()}
          >
            {busy ? "Keluar…" : "Keluar"}
          </Button>
        </>
      ) : null}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
