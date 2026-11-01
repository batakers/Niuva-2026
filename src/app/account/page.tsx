import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { connection } from "next/server";

import { PublicShell } from "@/components/niuva/public-shell";
import { StatusNotice } from "@/components/niuva/status-notice";
import { typographySystemTokens as type } from "@/design/typography";
import { requireCustomer } from "@/lib/auth/customer";
import { resolveCustomerAvatar } from "@/lib/images/customer-avatar";
import { isAppError } from "@/modules/shared/errors";
import { CustomerAuthRepository } from "@/modules/customer-auth/repository";
import { CustomerWorkRepository } from "@/modules/customer-work/repository";
import { readCustomerPreviewSnapshot } from "@/modules/custom-print/customer-preview";

import { AccountView, type AccountMakeRequest } from "./account-view";

export const metadata: Metadata = {
  title: "Akun Customer · Niuva",
  description: "Pantau pengajuan Custom 3D Print, quote, dan pesanan Niuva.",
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  await connection();
  let customer;
  try {
    customer = await requireCustomer();
  } catch (error) {
    if (isAppError(error) && error.code === "UNAUTHORIZED") {
      redirect("/login?returnTo=/account");
    }

    if (isAppError(error) && error.code === "CUSTOMER_AUTH_UNAVAILABLE") {
      return (
        <PublicShell functionalStatus="capability-gated" scope="account">
          <main className="mx-auto max-w-public px-5 pt-10 pb-16 sm:px-12 sm:pt-14" id="main-content">
            <h1 className={`${type.display.className} max-w-[16em] text-balance`}>Akun Customer belum tersedia.</h1>
            <div className="mt-8 max-w-2xl">
              <StatusNotice
                tone="warning"
                title="Akun belum dapat dibuka."
                description="Login Customer belum tersedia saat ini, jadi pengajuan dan pesanan belum dapat ditampilkan di akun."
              />
            </div>
          </main>
        </PublicShell>
      );
    }

    throw error;
  }

  const account = await new CustomerAuthRepository().getAccount(customer.id);
  if (account === null) {
    redirect("/login?returnTo=/account&error=auth_failed");
  }
  const work = await new CustomerWorkRepository().list(customer.id);
  const requests: AccountMakeRequest[] = work.requests.map((request) => {
    const estimate = request.estimates[0];
    const quote = request.quotes[0];
    return {
      createdAt: request.createdAt,
      estimate: estimate ? { lowerRp: estimate.lowerRp.toFixed(0), upperRp: estimate.upperRp.toFixed(0) } : null,
      id: request.id,
      intakeMode: request.intakeMode,
      previewTotalRp: readCustomerPreviewSnapshot(request.customerPreviewSnapshot)?.result.finalTotalRp ?? null,
      quote: quote ? { status: quote.status, version: quote.version } : null,
      referenceNumber: request.referenceNumber,
      status: request.status,
    };
  });

  return (
    <PublicShell functionalStatus="server-backed" scope="account">
      <AccountView account={account} avatar={resolveCustomerAvatar(account.profile.avatarUrl)} requests={requests} />
    </PublicShell>
  );
}
