import type { Metadata } from "next";
import { PublicPolicyPage } from "@/components/niuva/public-policy-page";

export const metadata: Metadata = { title: "Syarat Layanan · Niuva", robots: { follow: true, index: true } };

export default function TermsPage() {
  return <PublicPolicyPage document="terms" />;
}
