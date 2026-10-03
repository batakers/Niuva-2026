"use client";

import { SystemFocusTarget } from "@/components/niuva/system-focus-target";
import { SystemFrame } from "@/components/niuva/system-frame";
import { SystemStateView } from "@/components/niuva/system-state-view";
import { systemCopy } from "@/components/niuva/system-state-copy";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { Button } from "@/components/ui/button";

/**
 * Public error boundary. It uses the standalone `SystemFrame` because `PublicShell`
 * is a server tree and is not available in this client boundary (design Keputusan A).
 * Only `retry` is destructured: the `error` prop is intentionally never read, so no
 * message, stack, or digest can reach the DOM. `retry()` re-fetches and re-renders
 * the segment; `reset()` is deliberately not used.
 */
export default function PublicError({ retry }: Readonly<{ retry: () => void }>) {
  return (
    <SystemFrame>
      <meta name="robots" content="noindex, nofollow" />
      <SystemFocusTarget />
      <SystemStateView variant="public" stateId="error" {...systemCopy.publicError}>
        <Button type="button" className="min-h-11" onClick={() => retry()}>
          {systemCopy.actions.retry}
        </Button>
        <NiuvaLink href="/" variant="outline" className="min-h-11">
          {systemCopy.actions.home}
        </NiuvaLink>
      </SystemStateView>
    </SystemFrame>
  );
}
