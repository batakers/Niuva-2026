import type { Metadata } from "next";

import { CustomerAuthPage } from "@/components/niuva/customer-auth-page";

export const metadata: Metadata = {
  title: "Daftar Customer · Niuva",
  description: "Daftar Customer Niuva dengan Google.",
};

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
    loggedOut?: string | string[];
    returnTo?: string | string[];
  }>;
}) {
  return <CustomerAuthPage mode="register" searchParams={searchParams} />;
}
