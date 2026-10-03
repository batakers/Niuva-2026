"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { StatusNotice } from "@/components/niuva/status-notice";
import { systemCopy } from "@/components/niuva/system-state-copy";
import { Button } from "@/components/ui/button";

/**
 * Signs the current account out and returns to the public home page.
 * A failure shows a static alert immediately (no raw error detail) and the
 * button stays enabled so the user can try again.
 */
export function AdminSignOutButton() {
  const { signOut } = useClerk();
  const [failed, setFailed] = useState(false);

  async function handleSignOut() {
    setFailed(false);
    try {
      await signOut({ redirectUrl: "/" });
    } catch {
      setFailed(true);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {failed ? (
        <StatusNotice
          description={systemCopy.signOutFailed.description}
          role="alert"
          size="compact"
          title={systemCopy.signOutFailed.title}
          tone="error"
        />
      ) : null}
      <Button
        className="w-full sm:w-auto"
        onClick={handleSignOut}
        type="button"
        variant="outline"
      >
        {systemCopy.actions.signOut}
      </Button>
    </div>
  );
}

/**
 * Re-evaluates the server render of the current admin route. If the server
 * still renders AUTH_UNAVAILABLE, the same state is shown and the button is
 * active again once the transition ends.
 */
export function AdminReloadButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      aria-busy={pending}
      className="w-full sm:w-auto"
      disabled={pending}
      onClick={() => {
        startTransition(() => {
          router.refresh();
        });
      }}
      type="button"
      variant="outline"
    >
      {pending ? "Memuat ulang…" : systemCopy.actions.reload}
    </Button>
  );
}
