/**
 * Studio rental prices from the Owner price list (`docs/source/Pricelist 3D Print Niuva.xlsx`, matching the
 * incubation pitch deck), published by Owner decision on 2 November 2026. Display only: bookings stay manual
 * over WhatsApp, and nothing here is charged online.
 */
export type StudioPrice = Readonly<{
  label: string;
  note?: string;
  /** Whole rupiah; 0 means free. */
  amountRp: number;
  /** Shown after the amount, e.g. "/jam". */
  per?: string;
}>;

export type StudioPriceGroup = Readonly<{ title: string; prices: readonly StudioPrice[] }>;

export const studioPriceGroups: readonly StudioPriceGroup[] = [
  {
    title: "Sewa printer",
    prices: [
      { label: "1 jam", amountRp: 12_000 },
      { label: "8 jam", amountRp: 75_000 },
      { label: "Membership", note: "50 jam per bulan", amountRp: 500_000, per: "/bulan" },
    ],
  },
  {
    title: "Filamen",
    prices: [
      { label: "Bawa sendiri", note: "Filamen dari rumah", amountRp: 5_000, per: "/proyek" },
      { label: "Filamen komunal Niuva", note: "Dihitung dari berat yang terpakai", amountRp: 500, per: "/gram" },
    ],
  },
  {
    title: "Slicing",
    prices: [
      { label: "Laptop atau PC sendiri", note: "Bawa file siap cetak", amountRp: 0 },
      { label: "PC Niuva", note: "Slicing sendiri di PC studio", amountRp: 15_000, per: "/30 menit" },
      { label: "Full Service", note: "Operator membantu seluruh proses slicing", amountRp: 35_000, per: "/file" },
    ],
  },
];

/** The cheapest hourly rental, used by the hook on the Custom 3D Print start options. */
export const studioHourlyFromRp = 12_000;

/** Opening hours given by the Owner on 2 November 2026. */
export const studioOpeningHours = "Senin–Jumat, 09.00–17.00 WIB";

/** Bookings go to the site WhatsApp number from Informasi Situs, so one Admin change updates every contact. */
export function createStudioBookingWhatsAppHref(phone: string): string {
  const message = "Halo Niuva, saya ingin booking sewa printer di studio. Mohon info jadwal yang tersedia.";
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}
