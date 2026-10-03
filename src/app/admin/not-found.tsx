import type { Metadata } from "next";
import { SystemFocusTarget } from "@/components/niuva/system-focus-target";
import { systemCopy } from "@/components/niuva/system-state-copy";
import { SystemStateView } from "@/components/niuva/system-state-view";
import { NiuvaLink } from "@/components/ui/NiuvaLink";

export const metadata: Metadata = {
  title: "Data tidak ditemukan · Niuva Admin",
  robots: { index: false, follow: false },
};

/**
 * Admin not-found. Takes no props, does not call `requireAdmin()`, and shows no
 * id, role or raw text, so every missing admin record renders identical markup.
 * It renders under `admin/layout.tsx`, which already provides the admin context.
 */
export default function AdminNotFound() {
  return (
    <>
      <SystemFocusTarget />
      <SystemStateView variant="admin" stateId="admin-not-found" {...systemCopy.adminNotFound}>
        <NiuvaLink href="/admin" className="min-h-11">
          {systemCopy.actions.adminHome}
        </NiuvaLink>
      </SystemStateView>
    </>
  );
}
