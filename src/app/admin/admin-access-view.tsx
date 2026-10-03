import type { ReactNode } from "react";

import type { AdminAccessState } from "@/app/admin/admin-page-access";
import { AdminReloadButton, AdminSignOutButton } from "@/components/niuva/admin-access-actions";
import { SystemStateView } from "@/components/niuva/system-state-view";
import { systemCopy } from "@/components/niuva/system-state-copy";
import { NiuvaLink } from "@/components/ui/NiuvaLink";

const stateAction = {
  UNAUTHENTICATED: () => (
    <NiuvaLink href="/admin/sign-in" className="min-h-11">
      {systemCopy.actions.signIn}
    </NiuvaLink>
  ),
  FORBIDDEN: () => <AdminSignOutButton />,
  AUTH_UNAVAILABLE: () => <AdminReloadButton />,
} as const satisfies Record<AdminAccessState, () => ReactNode>;

/**
 * Admin access gate for a denied request. Renders only static copy and the one
 * control that fits the state. It never receives or renders an email, user id,
 * role name or raw error. Robots metadata is set by the page and admin layout.
 */
export function AdminAccessView({ state }: Readonly<{ state: AdminAccessState }>) {
  const { title, description } = systemCopy.adminAccess[state];

  return (
    <SystemStateView variant="admin" stateId={`admin-access-${state.toLowerCase()}`} title={title} description={description}>
      {stateAction[state]()}
      <NiuvaLink href="/" variant="outline" className="min-h-11">
        {systemCopy.actions.publicSite}
      </NiuvaLink>
    </SystemStateView>
  );
}
