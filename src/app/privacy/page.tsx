import type { Metadata } from "next";
import { PublicPolicyPage } from "@/components/niuva/public-policy-page";

export const metadata: Metadata = { title: "Kebijakan Privasi · Niuva", robots: { follow: true, index: true } };

export default function PrivacyPage() {
  return <PublicPolicyPage document="privacy" />;
}
