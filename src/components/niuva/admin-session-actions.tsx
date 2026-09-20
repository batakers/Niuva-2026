"use client";

import { SignOutButton } from "@clerk/nextjs";
import Link from "next/link";

export function AdminSessionActions({
  dark = false,
  showLogout = false,
  retryHref,
}: Readonly<{ dark?: boolean; retryHref?: string; showLogout?: boolean }>) {
  const buttonClassName = dark
    ? "border-neutral-600 text-neutral-200 hover:border-neutral-300 hover:text-neutral-50"
    : "border-border text-foreground hover:border-brand-400";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {retryHref ? (
        <Link
          className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-semibold hover:border-brand-400 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          href={retryHref}
        >
          Muat ulang
        </Link>
      ) : null}
      {showLogout ? (
        <SignOutButton redirectUrl="/">
          <button
            className={`inline-flex min-h-11 items-center rounded-lg border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${buttonClassName}`}
            type="button"
          >
            Keluar
          </button>
        </SignOutButton>
      ) : null}
    </div>
  );
}
