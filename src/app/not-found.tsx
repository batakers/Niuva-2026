import type { Metadata } from "next";
import { PublicShell } from "@/components/niuva/public-shell";
import { SystemFocusTarget } from "@/components/niuva/system-focus-target";
import { systemCopy } from "@/components/niuva/system-state-copy";
import { SystemStateView } from "@/components/niuva/system-state-view";
import { NiuvaLink } from "@/components/ui/NiuvaLink";

export const metadata: Metadata = {
  title: "Halaman tidak tersedia · Niuva",
  robots: { index: false, follow: false },
};

const a = systemCopy.actions;

/**
 * Root not-found. Takes no props and reads no path, slug, token or query,
 * so every unmatched URL and every token failure renders identical markup.
 */
export default function RootNotFound() {
  return (
    <PublicShell scope="system-not-found">
      <SystemFocusTarget />
      <SystemStateView variant="public" stateId="not-found" {...systemCopy.notFound}>
        <NiuvaLink href="/" className="min-h-11">
          {a.home}
        </NiuvaLink>
        <NiuvaLink href="/shop" variant="outline" className="min-h-11">
          {a.shop}
        </NiuvaLink>
      </SystemStateView>
    </PublicShell>
  );
}
