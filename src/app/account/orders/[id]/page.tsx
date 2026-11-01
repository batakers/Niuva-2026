import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { PublicShell } from "@/components/niuva/public-shell";
import { requireCustomer } from "@/lib/auth/customer";
import { CustomerAuthRepository } from "@/modules/customer-auth/repository";
import { isAppError } from "@/modules/shared/errors";

import { OrderDetailView } from "./order-detail-view";

export const metadata: Metadata = { title: "Pesanan · Akun Niuva", robots: { index: false, follow: false } };
export default async function AccountOrderPage({ params }: PageProps<"/account/orders/[id]">) {
  await connection();
  const { id } = await params;
  let customer;
  try { customer = await requireCustomer(); }
  catch (error) {
    if (isAppError(error) && error.code === "UNAUTHORIZED") redirect(`/login?returnTo=${encodeURIComponent(`/account/orders/${id}`)}`);
    throw error;
  }
  const order = await new CustomerAuthRepository().getOrderForCustomer(customer.id, id);
  if (order === null) notFound();
  const payment = order.paymentAttempts[0];
  const shipment = order.shipments[0];
  const payable = payment !== undefined && payment.status === "PENDING" && payment.expiresAt > new Date()
    && payment.redirectUrl?.startsWith("https://") === true;
  return <PublicShell scope="account" functionalStatus="server-backed">
    <OrderDetailView order={{
      cancelledAt: order.cancelledAt,
      completedAt: order.completedAt,
      createdAt: order.createdAt,
      grandTotalRp: order.grandTotalRp.toFixed(0),
      id: order.id,
      items: order.items.map((item) => ({ label: item.nameSnapshot, quantity: item.quantity, totalRp: item.lineTotalRp.toFixed(0) })),
      itemsSubtotalRp: order.itemsSubtotalRp.toFixed(0),
      orderNumber: order.orderNumber,
      orderType: order.orderType,
      paidAt: order.paidAt,
      payment: payment ? {
        amountRp: payment.amountRp.toFixed(0),
        expiresAt: payment.expiresAt,
        payUrl: payable ? payment.redirectUrl : null,
        purpose: payment.purpose,
        status: payment.status,
      } : null,
      shipment: shipment ? {
        courier: [shipment.courierCode, shipment.serviceCode].filter(Boolean).join(" ").toUpperCase() || null,
        status: shipment.status,
        trackingNumber: shipment.trackingNumber,
      } : null,
      shippingTotalRp: order.shippingTotalRp.toFixed(0),
      status: order.status,
    }} />
  </PublicShell>;
}
