import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/niuva/admin-shell";
import {
  getAdminPreviewAccessLabel,
  getAdminPreviewRouteTarget,
  SignInView,
  type AdminPreviewState,
} from "@/features/admin/sign-in-view";

export const metadata: Metadata = {
  title: "Preview admin · Niuva",
  description: "Preview development untuk shell dan status akses admin Niuva.",
  robots: { follow: false, index: false },
};

const previewStates = ["auth-unavailable", "forbidden", "ready"] as const satisfies readonly AdminPreviewState[];

function getPreviewState(value: string | string[] | undefined): AdminPreviewState {
  const candidate = Array.isArray(value) ? undefined : value;

  return previewStates.includes(candidate as AdminPreviewState)
    ? (candidate as AdminPreviewState)
    : "auth-unavailable";
}

export default async function AdminPreviewPage({
  searchParams,
}: PageProps<"/auis/proofs/frontend/admin">) {
  const query = await searchParams;

  if (process.env.NODE_ENV !== "development" || query.preview !== "examples") {
    notFound();
  }

  const state = getPreviewState(query.state);

  return (
    <AdminShell
      accessLabel={getAdminPreviewAccessLabel(state)}
      activeModule={state === "ready" ? "action-queue" : null}
      routeTarget={getAdminPreviewRouteTarget(state)}
    >
      <SignInView state={state} />
    </AdminShell>
  );
}
