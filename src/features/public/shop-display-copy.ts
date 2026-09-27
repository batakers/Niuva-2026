type ShopDisplayCopy = Readonly<{
  curated: boolean;
  name: string;
  summary: string;
}>;

// Presentation copy for the three Owner-published ready-made products. Catalog
// records, terms, slugs, price, and stock remain the source of truth.
const approvedDisplayCopy: Readonly<Record<string, Readonly<{
  sourceName: string;
  name: string;
  summary: string;
}>>> = {
  "kicau-mania-kunci-gantung-kucing-lucu-dengan-desain-kreatif-dan-warna-cerah-untuk-penggemar-kucing-dan-aksesori-unik": {
    sourceName: "Kicau Mania Kunci Gantung Kucing Lucu dengan Desain Kreatif dan Warna Cerah untuk Penggemar Kucing dan Aksesori Unik",
    name: "Gantungan Kunci Kucing Kicau Mania",
    summary: "Merchandise cetak 3D berbahan PLA multicolor dengan ukuran produk 8 cm.",
  },
  "3d-print-keychain-gedung-telkom-university-tult-bandung-techno-park": {
    sourceName: "3D PRINT KEYCHAIN GEDUNG TELKOM UNIVERSITY (TULT, BANDUNG TECHNO PARK)",
    name: "Gantungan Kunci Gedung TULT dan Bandung Techno Park",
    summary: "Gantungan kunci cetak 3D berbahan PLA, ukuran produk 8 cm, dengan pilihan desain gedung TULT dan Bandung Techno Park.",
  },
  "3d-print-keychain-animal-telkom-university": {
    sourceName: "3D PRINT KEYCHAIN ANIMAL TELKOM UNIVERSITY",
    name: "Gantungan Kunci Animal Telkom University",
    summary: "Gantungan kunci cetak 3D berbahan PLA, ukuran produk 8 cm, dengan pilihan karakter pada halaman detail.",
  },
};

export function getShopDisplayCopy(product: Readonly<{
  slug: string;
  name: string;
  description: string;
}>): ShopDisplayCopy {
  const approved = approvedDisplayCopy[product.slug];
  if (!approved || approved.sourceName !== product.name) {
    return { curated: false, name: product.name, summary: product.description };
  }

  return { curated: true, name: approved.name, summary: approved.summary };
}
