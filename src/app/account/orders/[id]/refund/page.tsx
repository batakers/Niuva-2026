import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { PublicShell } from "@/components/niuva/public-shell";
import { requireCustomer } from "@/lib/auth/customer";
import { RefundService } from "@/modules/refund/service";
import { isAppError } from "@/modules/shared/errors";
import { requestRefundAction } from "./actions";
import { RefundView } from "./refund-view";

export const metadata: Metadata = { title: "Pengajuan refund · Akun Niuva", robots: { index: false, follow: false } };
export default async function CustomerRefundPage({ params }: PageProps<"/account/orders/[id]/refund">) {
  await connection();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  let customer;
  try { customer = await requireCustomer(); }
  catch (error) { if (isAppError(error) && error.code === "UNAUTHORIZED") redirect(`/login?returnTo=${encodeURIComponent(`/account/orders/${id}/refund`)}`); throw error; }
  const view = await new RefundService().customerOrder(customer.id, id).catch(error => { if (isAppError(error) && error.code === "NOT_FOUND") notFound(); throw error; });
  return <PublicShell scope="account" functionalStatus="server-backed">
    <RefundView action={requestRefundAction.bind(null, id)} orderId={id} view={view} />
  </PublicShell>;
}
