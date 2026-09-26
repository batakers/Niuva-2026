export type PreviewArea =
  | "overview"
  | "queue"
  | "orders"
  | "custom-print"
  | "inquiries"
  | "products"
  | "portfolio"
  | "pricing";

export type ModuleArea = Exclude<PreviewArea, "overview" | "queue">;
export type WorkGroup = "all" | "inquiries" | "custom-print" | "orders";

export type PreviewRecord = Readonly<{
  id: string;
  area: ModuleArea;
  reference: string;
  title: string;
  description: string;
  status: string;
  updated: string;
  nextStep: string;
}>;

export type PreviewWork = Readonly<{
  id: string;
  group: Exclude<WorkGroup, "all">;
  recordId: string;
  title: string;
  reference: string;
  nextStep: string;
  updated: string;
  attention: "standard" | "exception";
}>;

// All values and references below are invented for the isolated design preview.
export const previewRecords: readonly PreviewRecord[] = [
  { id: "inquiry-1", area: "inquiries", reference: "BRF-DEMO-104", title: "Enclosure sensor lingkungan", description: "Brief B2B untuk riset bentuk, prototipe, dan validasi awal.", status: "Baru", updated: "2 jam lalu", nextStep: "Tinjau kebutuhan dan tetapkan tahap berikutnya" },
  { id: "inquiry-2", area: "inquiries", reference: "BRF-DEMO-103", title: "Sistem display modular", description: "Permintaan konsultasi desain dan manufaktur skala kecil.", status: "Dalam peninjauan", updated: "Kemarin", nextStep: "Lanjutkan review brief" },
  { id: "inquiry-3", area: "inquiries", reference: "BRF-DEMO-102", title: "Prototype alat edukasi", description: "Eksplorasi produk interaktif untuk pengujian pengguna.", status: "Qualified", updated: "2 hari lalu", nextStep: "Siapkan tindak lanjut konsultasi" },
  { id: "custom-1", area: "custom-print", reference: "CP-DEMO-218", title: "Housing alat uji", description: "File model menunggu review operator dan pemeriksaan orientasi.", status: "Menunggu review", updated: "3 jam lalu", nextStep: "Mulai review model" },
  { id: "custom-2", area: "custom-print", reference: "CP-DEMO-217", title: "Jig perakitan", description: "Hasil slicing siap untuk penyusunan quotation.", status: "Siap dibuatkan quote", updated: "5 jam lalu", nextStep: "Siapkan quote" },
  { id: "custom-3", area: "custom-print", reference: "CP-DEMO-216", title: "Casing perangkat kecil", description: "Draft quotation membutuhkan pengiriman oleh operator.", status: "Draft quote", updated: "Kemarin", nextStep: "Kirim quote" },
  { id: "order-1", area: "orders", reference: "ORD-DEMO-365", title: "Kit prototipe meja", description: "Order retail dengan pembayaran terkonfirmasi.", status: "Dibayar", updated: "4 jam lalu", nextStep: "Proses pesanan" },
  { id: "order-2", area: "orders", reference: "ORD-DEMO-364", title: "Komponen custom", description: "Pengerjaan selesai; paket perlu diukur untuk pengiriman.", status: "Finishing & QC", updated: "Kemarin", nextStep: "Ukur paket final" },
  { id: "order-3", area: "orders", reference: "ORD-DEMO-363", title: "Paket produk studio", description: "Status pengiriman memerlukan pemeriksaan operator.", status: "Exception pengiriman", updated: "1 jam lalu", nextStep: "Tinjau pengiriman" },
  { id: "product-1", area: "products", reference: "PRD-DEMO-041", title: "Desk organizer modular", description: "Produk ready-made dengan dua varian.", status: "Tayang", updated: "Hari ini", nextStep: "Pantau stok varian" },
  { id: "product-2", area: "products", reference: "PRD-DEMO-040", title: "Stand perangkat", description: "Draft katalog menunggu pemeriksaan konten.", status: "Draft", updated: "Kemarin", nextStep: "Periksa detail produk" },
  { id: "product-3", area: "products", reference: "PRD-DEMO-039", title: "Tray komponen", description: "Satu varian perlu pembaruan stok.", status: "Stok perlu perhatian", updated: "2 hari lalu", nextStep: "Tinjau stok" },
  { id: "portfolio-1", area: "portfolio", reference: "PFL-DEMO-012", title: "Sistem wadah modular", description: "Studi kasus proses desain hingga prototype.", status: "Tayang", updated: "Kemarin", nextStep: "Periksa informasi proyek" },
  { id: "portfolio-2", area: "portfolio", reference: "PFL-DEMO-011", title: "Fixture pengujian", description: "Draft cerita proyek untuk halaman portfolio.", status: "Draft", updated: "3 hari lalu", nextStep: "Lengkapi ringkasan proyek" },
  { id: "pricing-1", area: "pricing", reference: "RULE-DEMO-01", title: "Aturan material PLA", description: "Contoh tampilan versi aturan; tidak mewakili harga aktif.", status: "Contoh aktif", updated: "Hari ini", nextStep: "Tinjau versi aturan" },
  { id: "pricing-2", area: "pricing", reference: "RULE-DEMO-02", title: "Aturan material ABS", description: "Contoh tampilan versi aturan; tidak mewakili harga aktif.", status: "Contoh draft", updated: "Kemarin", nextStep: "Periksa konfigurasi" },
];

export const previewWork: readonly PreviewWork[] = [
  { id: "work-shipping", group: "orders", recordId: "order-3", title: "Exception pengiriman", reference: "ORD-DEMO-363", nextStep: "Tinjau pengiriman", updated: "1 jam lalu", attention: "exception" },
  { id: "work-inquiry", group: "inquiries", recordId: "inquiry-1", title: "Brief proyek baru", reference: "BRF-DEMO-104", nextStep: "Tinjau brief", updated: "2 jam lalu", attention: "standard" },
  { id: "work-custom", group: "custom-print", recordId: "custom-1", title: "Custom print perlu review", reference: "CP-DEMO-218", nextStep: "Mulai review", updated: "3 jam lalu", attention: "standard" },
  { id: "work-order", group: "orders", recordId: "order-1", title: "Order dibayar", reference: "ORD-DEMO-365", nextStep: "Proses pesanan", updated: "4 jam lalu", attention: "standard" },
  { id: "work-quote", group: "custom-print", recordId: "custom-2", title: "Siapkan quotation", reference: "CP-DEMO-217", nextStep: "Siapkan quote", updated: "5 jam lalu", attention: "standard" },
  { id: "work-measure", group: "orders", recordId: "order-2", title: "Ukur paket final", reference: "ORD-DEMO-364", nextStep: "Ukur paket", updated: "Kemarin", attention: "standard" },
  { id: "work-send", group: "custom-print", recordId: "custom-3", title: "Kirim draft quote", reference: "CP-DEMO-216", nextStep: "Kirim quote", updated: "Kemarin", attention: "standard" },
];

export const activity = Array.from({ length: 30 }, (_, index) => ({
  day: index + 1,
  inquiries: [0, 1, 0, 2, 1, 0, 1, 1, 0, 2, 1, 0, 1, 3, 1, 0, 2, 1, 1, 0, 1, 2, 0, 1, 1, 0, 2, 1, 1, 2][index],
  custom: [1, 0, 1, 1, 0, 2, 1, 0, 1, 1, 2, 1, 0, 1, 2, 1, 0, 1, 1, 2, 1, 0, 1, 1, 2, 1, 0, 1, 2, 1][index],
  orders: [0, 1, 1, 0, 2, 1, 0, 1, 1, 1, 0, 2, 1, 1, 0, 1, 2, 1, 0, 1, 1, 2, 1, 0, 1, 2, 1, 1, 0, 2][index],
}));
