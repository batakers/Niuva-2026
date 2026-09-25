import type { Metadata } from "next";

import { CustomerAuthPage } from "@/components/niuva/customer-auth-page";

export const metadata: Metadata = {
  title: "Login Customer · Niuva",
  description: "Login Customer Niuva dengan Google.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string | string[];
    loggedOut?: string | string[];
    returnTo?: string | string[];
  }>;
}) {
  return <CustomerAuthPage mode="login" searchParams={searchParams} />;
}
