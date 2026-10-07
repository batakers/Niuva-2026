import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { z } from "zod";
import { loadAdminPageAccess } from "@/app/admin/admin-page-access";
import { AdminAccessView } from "@/app/admin/admin-access-view";
import { AdminPageHeader } from "@/app/admin/admin-page-header";
import { AdminDataUnavailableView, AdminShell } from "@/components/niuva/admin-shell";
import { normalizeAdminReturnTo, withAdminReturnTo } from "@/modules/admin/navigation";
import { loadCustomPrintPageData } from "../custom-print-page-data";
import { CustomPrintReviewWorkspace, parseReviewStep } from "./review-workspace";
export const metadata: Metadata = { title: "Review & Quote · Niuva", robots: { index: false, follow: false } };
export default async function AdminCustomPrintReviewPage({ params, searchParams }: Readonly<{ params: Promise<{ id: string }>; searchParams?: Promise<Readonly<Record<string, unknown>>> }>) {
  await connection();
  const gate = await loadAdminPageAccess();
  if (gate.kind === "denied") return <AdminAccessView state={gate.state} />;
  const { access } = gate;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const query = await searchParams;
  const returnTo = normalizeAdminReturnTo(query?.returnTo, "/admin/custom-print");
  const loaded = await loadCustomPrintPageData(id, access);
  if (loaded.status === "not-found") notFound();
  if (loaded.status === "unavailable") return <AdminDataUnavailableView active="custom-print" role={access.profile.role} kind={loaded.kind} title="Workspace custom print belum dapat dimuat" />;
  const detailHref = withAdminReturnTo(`/admin/custom-print/${id}`, returnTo);
  return <AdminShell active="custom-print" role={access.profile.role}><main id="main-content" data-admin-surface="custom-print-workspace" className="space-y-6">
    <AdminPageHeader title="Review & Quote" description={loaded.record.request.referenceNumber} returnHref={detailHref} returnLabel="Kembali ke detail request" breadcrumbs={[{ label: "Custom Print", href: returnTo }, { label: loaded.record.request.referenceNumber, href: detailHref }, { label: "Review & Quote" }]} />
    <CustomPrintReviewWorkspace data={loaded.record} step={parseReviewStep(query?.step)} returnTo={returnTo} />
  </main></AdminShell>;
}
