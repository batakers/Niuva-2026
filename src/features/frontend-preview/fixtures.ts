import type { PublicProject, PublicShopProduct } from "./types";

// Fictional design-review content. Loaded only by the development server boundary.
export const exampleProjects: readonly PublicProject[] = [
  {
    id: "example-enclosure", slug: "contoh-enclosure", title: "Dari sketsa ke enclosure yang dapat ditinjau.",
    summary: "Contoh susunan studi kasus untuk memperlihatkan hubungan kebutuhan, desain, dan prototype.",
    serviceLabel: "Desain dan prototyping", clientName: null,
    challenge: "Skenario contoh: merancang ruang bagi komponen dan akses perakitan dalam satu enclosure.",
    process: "Kebutuhan dirangkum, alternatif bentuk dibandingkan, lalu prototype digunakan untuk meninjau akses dan sambungan.",
    result: "Pada contoh ini, hasil ditampilkan sebagai bahan diskusi iterasi berikutnya. Tidak ada klaim pengujian atau hasil client.",
    media: [],
  },
  {
    id: "example-workshop", slug: "contoh-workshop", title: "Menyamakan arah sebelum membuat prototype.",
    summary: "Contoh dokumentasi keputusan tim, pertanyaan terbuka, dan langkah eksplorasi.",
    serviceLabel: "Konsultasi dan workshop", clientName: null,
    challenge: "Skenario contoh: beberapa ide perlu dipetakan sebelum memilih hal pertama yang akan diuji.",
    process: "Konteks dan batasan dikumpulkan, asumsi dipisahkan dari bukti, kemudian agenda eksplorasi disusun.",
    result: "Contoh keluaran berupa arah diskusi. Ini bukan dokumentasi workshop yang pernah dilaksanakan.",
    media: [],
  },
];

// Fictional catalog records for layout and interaction review. They are not
// launch inventory, and the server boundary never loads them in production.
export const exampleShopProducts: readonly PublicShopProduct[] = [
  {
    id: "example-desk-dock",
    name: "Dock modular meja",
    slug: "contoh-dock-modular-meja",
    description: "Tempat ringkas untuk menata perangkat kecil dan kabel di area kerja.",
    category: { name: "Workspace", slug: "workspace" },
    media: [],
    variants: [
      { id: "example-dock-blue", name: "Biru", priceRp: "185000", sku: "EX-DOCK-BLUE", stockOnHand: 8, weightGrams: "240" },
      { id: "example-dock-grey", name: "Abu-abu", priceRp: "185000", sku: "EX-DOCK-GREY", stockOnHand: 3, weightGrams: "240" },
    ],
  },
  {
    id: "example-display-stand",
    name: "Stand display ringkas",
    slug: "contoh-stand-display-ringkas",
    description: "Dudukan sederhana untuk membantu objek kecil terlihat rapi saat dipajang.",
    category: { name: "Display", slug: "display" },
    media: [],
    variants: [
      { id: "example-stand-small", name: "Kecil", priceRp: "145000", sku: "EX-STAND-S", stockOnHand: 0, weightGrams: "180" },
      { id: "example-stand-medium", name: "Sedang", priceRp: "175000", sku: "EX-STAND-M", stockOnHand: 0, weightGrams: "260" },
    ],
  },
  {
    id: "example-component-tray",
    name: "Tray komponen",
    slug: "contoh-tray-komponen",
    description: "Wadah kerja untuk mengelompokkan komponen kecil selama perakitan ringan.",
    category: { name: "Workspace", slug: "workspace" },
    media: [],
    variants: [
      { id: "example-tray-single", name: "Standar", priceRp: "125000", sku: "EX-TRAY-STD", stockOnHand: 6, weightGrams: "210" },
    ],
  },
  {
    id: "example-material-swatch",
    name: "Set sampel material",
    slug: "contoh-set-sampel-material",
    description: "Kumpulan contoh permukaan untuk membantu percakapan awal tentang arah material.",
    category: { name: "Material", slug: "material" },
    media: [],
    variants: [
      { id: "example-swatch-standard", name: "Standar", priceRp: "95000", sku: "EX-SWATCH-STD", stockOnHand: 12, weightGrams: "160" },
    ],
  },
];
