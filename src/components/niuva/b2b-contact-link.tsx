"use client";

import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { createB2BWhatsAppHref } from "@/features/public/company-content";
import { usePublicSiteInformation } from "./public-site-information";

export function B2BContactLink({ service, className, size = "default", variant = "outline" }: Readonly<{
  service?: string;
  className?: string;
  size?: "default" | "sm" | "lg";
  /** `onBrand` is the same outline action for use on the Niuva-blue panel. */
  variant?: "outline" | "link" | "onBrand";
}>) {
  const { phone } = usePublicSiteInformation();
  return <NiuvaLink className={className} href={createB2BWhatsAppHref(phone, service)} size={size} variant={variant}>Hubungi Kami</NiuvaLink>;
}
