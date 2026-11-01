import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { cookies } from "next/headers";
import { PublicShell } from "@/components/niuva/public-shell";
import { requireCustomer } from "@/lib/auth/customer";
import { isAppError } from "@/modules/shared/errors";
import { CustomerPrivacyRepository } from "@/modules/customer-privacy/repository";
import { isCustomerPrivacyAvailable } from "@/modules/customer-privacy/core";
import { PRIVACY_ERROR_MESSAGES } from "@/modules/customer-privacy/handler";
import { CUSTOMER_SESSION_COOKIE, hashOpaqueToken } from "@/modules/customer-auth/core";
import { PrivacyCenterView } from "./privacy-center-view";

export const metadata: Metadata = { title: "Pusat privasi · Niuva", robots: { index: false, follow: false } };

function statusMessage(status: string | undefined, delivery: string): string | null {
  if (!status || !["queued", "sent", "received"].includes(status)) return null;
  if (status === "received") return "Permintaan diterima. Nomor dan status tersedia di bawah.";
  if (delivery === "queued") return "Email konfirmasi masuk antrean pengiriman. Setelah diterima, buka tautan pada browser dan sesi ini sebelum kedaluwarsa. Masa berlaku tautan tidak diperpanjang selama pengiriman.";
  if (delivery === "accepted") return "Provider menerima pengiriman email konfirmasi. Periksa inbox dan spam; buka tautan pada browser serta sesi ini dalam 15 menit. Penerimaan di inbox belum dikonfirmasi aplikasi.";
  return "Email konfirmasi belum tersedia. Minta tautan baru jika diperlukan.";
}

export default async function PrivacyPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string; reference?: string; fields?: string }> }) {
  await connection();
  let customer;
  try { customer = await requireCustomer(); } catch (error) { if (isAppError(error) && error.code === "UNAUTHORIZED") redirect("/login?returnTo=%2Faccount%2Fprivacy"); throw error; }
  const params = await searchParams;
  const available = isCustomerPrivacyAvailable();
  const requests = available ? await new CustomerPrivacyRepository().list(customer.id) : [];
  const sessionToken = (await cookies()).get(CUSTOMER_SESSION_COOKIE)?.value;
  const delivery = available && sessionToken ? await new CustomerPrivacyRepository().confirmationDeliveryStatus({ customerId: customer.id, sessionHash: hashOpaqueToken(sessionToken) }, new Date()) : "none";
  const initialErrors: Record<string, string> = {};
  if (params.fields) { try { const parsed: unknown = JSON.parse(params.fields); if (parsed && typeof parsed === "object") for (const [key, value] of Object.entries(parsed)) if (["details", "correction"].includes(key) && typeof value === "string") initialErrors[key] = value; } catch { /* Ignore malformed status query. */ } }
  return <PublicShell functionalStatus={available ? "server-backed" : "capability-gated"} scope="account">
    <PrivacyCenterView
      available={available}
      errorMessage={params.error ? PRIVACY_ERROR_MESSAGES[params.error] ?? "Permintaan gagal diproses." : null}
      initialErrors={initialErrors}
      requests={requests}
      statusMessage={statusMessage(params.status, delivery)}
    />
  </PublicShell>;
}
