"use client";

import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { createB2BWhatsAppHref } from "@/features/public/company-content";
import { usePublicSiteInformation } from "./public-site-information";

export function B2BContactLink({ service, className, size = "default", variant = "outline" }: Readonly<{
  service?: string;
  className?: string;
  size?: "default" | "sm" | "lg";
  variant?: "outline" | "link";
}>) {
  const { phone } = usePublicSiteInformation();
  return <NiuvaLink className={className} href={createB2BWhatsAppHref(phone, service)} size={size} variant={variant}>Hubungi Kami</NiuvaLink>;
}
