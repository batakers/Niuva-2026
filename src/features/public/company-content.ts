/**
 * Owner-approved public company and service copy.
 *
 * This is a versioned content source, not a statement of operational
 * capacity, delivery time, pricing, or project outcomes. Its companion
 * portfolio dataset is imported into Prisma through the guarded test seed.
 */

export const publicContentVersion = "2026-09-10" as const;

export const portfolioServiceCategories = [
  "Research & Development",
  "Consultant & Workshop",
  "Design & Prototyping",
  "Apparel & Merchandise",
] as const;

export type PortfolioServiceCategory = (typeof portfolioServiceCategories)[number];

export const publicCompanyProfile = {
  headline: "Mitra pengembangan produk dari riset hingga prototipe.",
  supportingCopy:
    "Melalui riset, konsultasi, desain, dan prototyping, Niuva membantu organisasi mengubah kebutuhan menjadi arah produk yang dapat ditinjau sebelum realisasi.",
  contact: {
    location:
      "Bandung Techno Park — Gedung D Lt. 1 (Ruang Makerspace), Jl. Telekomunikasi No. 1, Sukapura",
    email: "niuvamakerspace@gmail.com",
    phone: "+62 851-1767-8901",
    phoneHref: "tel:+6285117678901",
  },
} as const;

export const publicServices = [
  {
    slug: "research-development",
    title: "Research & Development",
    sourceScope:
      "Pengembangan produk dan teknologi yang sistematis untuk mendukung inovasi organisasi.",
    websiteFraming:
      "Menelusuri kebutuhan, batasan, dan arah teknis sebelum keputusan produk ditetapkan.",
    inputs:
      "Tujuan awal, konteks pengguna, dan batasan yang sudah diketahui.",
    outputs:
      "Arah eksplorasi serta pertanyaan keputusan untuk ditinjau bersama.",
    tags: ["Konteks", "Eksplorasi", "Arah keputusan"],
  },
  {
    slug: "consultant-workshop",
    title: "Consultant & Workshop",
    sourceScope:
      "Rekomendasi desain dari visi menuju manufaktur, beserta pelatihan interaktif untuk keterampilan dan kolaborasi.",
    websiteFraming:
      "Menyusun konsultasi dan workshop praktis agar tim dapat menyamakan keputusan dan membangun kapabilitas.",
    inputs:
      "Tujuan diskusi, pihak yang terlibat, serta keputusan yang perlu dipetakan.",
    outputs:
      "Pemahaman bersama dan langkah berikutnya yang dapat ditinjau.",
    tags: ["Konsultasi", "Workshop", "Kolaborasi"],
  },
  {
    slug: "design-prototyping",
    title: "Design & Prototyping",
    sourceScope:
      "Pengembangan ide visual melalui desain dan rapid prototyping untuk peninjauan konsep dan pengujian fungsional.",
    websiteFraming:
      "Menerjemahkan ide menjadi artefak desain dan prototipe yang dapat ditinjau lalu diiterasi.",
    inputs:
      "Sketsa, CAD, referensi, atau prototipe awal beserta tujuan penggunaannya.",
    outputs:
      "Desain dan prototipe sesuai ruang lingkup yang disepakati untuk ditinjau.",
    tags: ["Desain", "Iterasi", "Prototipe"],
  },
  {
    slug: "apparel-merchandise",
    title: "Apparel & Merchandise",
    sourceScope:
      "Desain produk yang ditujukan untuk mencerminkan identitas brand dan relevansi pasar.",
    websiteFraming:
      "Mengembangkan apparel, merchandise, dan aksesori beridentitas brand dari arah visual menuju persiapan produksi.",
    inputs:
      "Konteks penggunaan, arah visual, perkiraan jumlah, dan batas waktu yang tersedia.",
    outputs:
      "Arah produk dan kebutuhan produksi untuk dibahas bersama.",
    tags: ["Identitas brand", "Arah produk", "Persiapan produksi"],
  },
] as const satisfies readonly Readonly<{
  slug: string;
  title: PortfolioServiceCategory;
  sourceScope: string;
  websiteFraming: string;
  inputs: string;
  outputs: string;
  tags: readonly string[];
}>[];

export const publicContentPublication = {
  contentVersion: publicContentVersion,
  publicIntegrationApproved: true,
  productionPublicationApproved: true,
} as const;
