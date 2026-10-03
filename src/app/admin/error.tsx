"use client";

import { Button } from "@/components/ui/button";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { SystemFocusTarget } from "@/components/niuva/system-focus-target";
import { SystemStateView } from "@/components/niuva/system-state-view";
import { systemCopy } from "@/components/niuva/system-state-copy";

type ErrorBoundaryProps = Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
  retry: () => void;
}>;

/**
 * Error boundary for the admin segment. It is deliberately generic: identical
 * markup for every error, no user name/email/role, no `requireAdmin()` call, and no
 * claim about whether data changed (the failure may happen after a Server Action).
 * `error` (message, stack, digest) and `reset` are intentionally never read.
 * `retry` re-fetches and re-renders the segment, so it is the recovery action.
 */
export default function AdminError({ retry }: ErrorBoundaryProps) {
  const { title, description } = systemCopy.adminError;

  return (
    <>
      <meta name="robots" content="noindex, nofollow" />
      <SystemFocusTarget />
      <SystemStateView variant="admin" stateId="admin-error" title={title} description={description}>
        <Button type="button" className="min-h-11" onClick={() => retry()}>
          {systemCopy.actions.retry}
        </Button>
        <NiuvaLink href="/admin" variant="outline" className="min-h-11">
          {systemCopy.actions.adminHome}
        </NiuvaLink>
      </SystemStateView>
    </>
  );
}
