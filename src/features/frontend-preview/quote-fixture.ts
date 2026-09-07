import type { QuotePreview } from "./quote";

export const exampleQuote: QuotePreview = {
  assumptions: [
    {
      label: "Berat hasil review",
      value: "128,400000 g",
      detail: "Nilai slicer contoh yang dibekukan bersama quote.",
    },
    {
      label: "Durasi mesin",
      value: "5 jam 20 menit",
      detail: "Durasi contoh dari review operator, bukan estimasi browser.",
    },
    {
      label: "Sumber filament",
      value: "Stok Niuva",
      detail: "Material mengikuti konfigurasi yang ditinjau operator.",
    },
    {
      label: "Pengiriman",
      value: "Belum termasuk",
      detail: "Ongkir dihitung setelah paket final selesai diukur.",
    },
  ],
  currency: "IDR",
  expiresAt: "14 September 2026, 16.00 WIB",
  lines: [
    {
      label: "Material",
      value: "Rp51.360",
      detail: "PLA, 128,400000 g, 2 unit",
    },
    {
      label: "Waktu mesin",
      value: "Rp64.000",
      detail: "5 jam 20 menit",
    },
  ],
  quoteNumber: "QUO-260907-K7M4",
  requestReference: "CPR-260905-N2Q8",
  scope: [
    { label: "Layanan", value: "Custom 3D Print" },
    { label: "Material", value: "PLA" },
    { label: "Jumlah", value: "2 unit" },
    { label: "Unit model", value: "Milimeter dikonfirmasi" },
  ],
  sentAt: "7 September 2026, 16.00 WIB",
  total: "Rp115.360",
  version: 2,
};
