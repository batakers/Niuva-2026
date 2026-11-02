"use client";

import { usePublicSiteInformation } from "@/components/niuva/public-site-information";
import { NiuvaLink } from "@/components/ui/NiuvaLink";
import { createStudioBookingWhatsAppHref } from "@/features/public/studio-rental";

/** Studio booking on the site WhatsApp number from Informasi Situs. */
export function StudioBookingLink() {
  const { phone } = usePublicSiteInformation();
  return (
    <>
      <NiuvaLink className="mt-8 min-h-11" href={createStudioBookingWhatsAppHref(phone)} rel="noreferrer">Booking lewat WhatsApp</NiuvaLink>
      <p className="mt-3 max-w-[44ch] text-caption leading-[1.45] text-muted-foreground">WhatsApp {phone}. Mesin yang tersedia, DP, dan syarat membership dikonfirmasi saat booking.</p>
    </>
  );
}
