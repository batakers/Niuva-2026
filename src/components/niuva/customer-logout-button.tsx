"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function CustomerLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function logout() {
    setPending(true);
    try {
      await fetch("/api/auth/logout", {
        credentials: "same-origin",
        method: "POST",
      });
    } finally {
      router.replace("/login?loggedOut=1");
    }
  }

  return (
    <Button type="button" variant="outline" disabled={pending} onClick={() => void logout()}>
      {pending ? "Logout…" : "Logout"}
    </Button>
  );
}
