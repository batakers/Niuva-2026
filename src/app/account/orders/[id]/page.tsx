import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";

import { PublicShell } from "@/components/niuva/public-shell";
import { requireCustomer } from "@/lib/auth/customer";
import { CustomerAuthRepository } from "@/modules/customer-auth/repository";
import { isAppError } from "@/modules/shared/errors";

export const metadata: Metadata = { title: "Order · Akun Niuva", robots: { index: false, follow: false } };
export default async function AccountOrderPage({ params }: PageProps<"/account/orders/[id]">) {
  await connection();
  let customer;
  try { customer = await requireCustomer(); }
  catch (error) {
    if (isAppError(error) && error.code === "UNAUTHORIZED") redirect("/login?returnTo=/account");
    throw error;
  }
  const { id } = await params;
  const order = await new CustomerAuthRepository().getOrderForCustomer(customer.id, id);
  if (order === null) notFound();
  const payment = order.paymentAttempts[0];
  const shipment = order.shipments[0];
  return <PublicShell scope="account" functionalStatus="server-backed"><main id="main-content" className="mx-auto max-w-public px-5 py-12 sm:px-8">
    <Link className="text-sm underline underline-offset-4" href="/account">Kembali ke akun</Link>
    <p className="mt-8 text-sm font-medium text-brand-700">{order.orderType} · {order.orderNumber}</p>
    <h1 className="mt-3 text-3xl font-semibold">Status order</h1>
    <p className="mt-4 text-lg font-medium">{order.status}</p>
    <section className="mt-8 rounded-xl border border-border bg-card p-6"><h2 className="text-xl font-semibold">Rincian</h2>
      <dl className="mt-4 space-y-3">{order.items.map((item, index) => <div className="flex justify-between gap-4 text-sm" key={`${item.nameSnapshot}-${index}`}><dt>{item.nameSnapshot} × {item.quantity}</dt><dd>Rp {item.lineTotalRp.toFixed(0)}</dd></div>)}
        <div className="flex justify-between gap-4 border-t border-border pt-3 text-sm"><dt>Produksi / item</dt><dd>Rp {order.itemsSubtotalRp.toFixed(0)}</dd></div>
        <div className="flex justify-between gap-4 text-sm"><dt>Pengiriman final</dt><dd>Rp {order.shippingTotalRp.toFixed(0)}</dd></div>
        <div className="flex justify-between gap-4 border-t border-border pt-3 font-semibold"><dt>Total</dt><dd>Rp {order.grandTotalRp.toFixed(0)}</dd></div>
      </dl></section>
    {payment && <section className="mt-6 rounded-xl border border-border bg-card p-6"><h2 className="text-xl font-semibold">Pembayaran</h2><p className="mt-2 text-sm">{payment.status} · Rp {payment.amountRp.toFixed(0)}</p>{payment.status === "PENDING" && payment.expiresAt > new Date() && payment.redirectUrl?.startsWith("https://") ? <a className="mt-4 inline-block underline underline-offset-4" href={payment.redirectUrl} rel="noopener noreferrer" referrerPolicy="no-referrer">Lanjutkan pembayaran</a> : null}</section>}
    {shipment && <section className="mt-6 rounded-xl border border-border bg-card p-6"><h2 className="text-xl font-semibold">Pengiriman</h2><p className="mt-2 text-sm">{shipment.status}{shipment.courierCode ? ` · ${shipment.courierCode}` : ""}{shipment.trackingNumber ? ` · ${shipment.trackingNumber}` : ""}</p></section>}
  </main></PublicShell>;
}
