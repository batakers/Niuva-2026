type ShopDisplayCopy = Readonly<{
  curated: boolean;
  name: string;
  summary: string;
}>;

// Owner-approved presentation copy for the eight published products: three first,
// the other five on 1 Nov 2026 ("Setujui usulan"; display names leave out the LEGO
// trademark). Catalog records, terms, slugs, price, and stock remain the source of truth.
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
  "preorder-3d-print-custom-figure-bubble-head-chibi-cartoon-emoji-read-description-for-order": {
    sourceName: "[PREORDER] 3D PRINT CUSTOM FIGURE (Bubble head, chibi, cartoon, emoji) READ DESCRIPTION FOR ORDER",
    name: "Figur Custom Gaya Kartun (Pre-order)",
    summary: "Figur cetak 3D berbahan PLA, ukuran 12 cm, dari foto referensi dalam gaya kartun, emoji, petite, atau big head; polos atau dicat tangan.",
  },
  "3d-print-custom-figure-special-moments-newborn-weddings-birthday-dll": {
    sourceName: "3D PRINT CUSTOM FIGURE SPECIAL MOMENTS (Newborn, weddings, birthday, dll)",
    name: "Figur Custom Special Moments",
    summary: "Figur cetak 3D berbahan PLA, ukuran 12 cm, dari foto momen seperti kelahiran, pernikahan, atau ulang tahun; polos atau dicat tangan dengan akrilik.",
  },
  "wisuda-custom-3d-print-patung-graduasi-3d-personalisasi-untuk-souvenir-khusus": {
    sourceName: "Wisuda Custom 3D Print - Patung Graduasi 3D Personalisasi untuk Souvenir Khusus",
    name: "Figur Wisuda Personalisasi",
    summary: "Figur wisuda cetak 3D berbahan PLA, ukuran 8–15 cm, dengan pilihan gaya dan pewarnaan.",
  },
  "3d-print-lego-figure-wisudawan-telkom-university-pla-bisa-custom-tali-toga-fakultas": {
    sourceName: "3D Print LEGO Figure Wisudawan Telkom University PLA (Bisa Custom Tali Toga Fakultas)",
    name: "Figur Wisudawan Telkom University, Tali Toga Fakultas",
    summary: "Figur wisudawan cetak 3D berbahan PLA, ukuran 12 cm, pilihan perempuan atau laki-laki, dengan tali toga sesuai fakultas.",
  },
  "3d-print-lego-figure-wisudawan-telkom-university": {
    sourceName: "3D PRINT LEGO FIGURE WISUDAWAN TELKOM UNIVERSITY",
    name: "Figur Wisudawan Telkom University",
    summary: "Figur wisudawan cetak 3D berbahan PLA, ukuran 12 cm.",
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
