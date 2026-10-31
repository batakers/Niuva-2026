/**
 * Owner-approved public company and service copy.
 *
 * This is a versioned content source, not a statement of operational
 * capacity, delivery time, pricing, or project outcomes. Its companion
 * portfolio dataset is imported into Prisma through the guarded test seed.
 */

export const publicContentVersion = "2026-10-31" as const;

// Owner, 31 Oct 2026: the four services follow NIUVA Profile 2026 (pp. 7–10).
export const portfolioServiceCategories = [
  "Riset & Pengembangan",
  "Desain & Rekayasa",
  "Prototipe & Manufaktur Digital",
  "Konsultansi & Workshop",
] as const;

export type PortfolioServiceCategory = (typeof portfolioServiceCategories)[number];

export const publicCompanyProfile = {
  headline: "Mitra pengembangan produk dari riset hingga prototipe.",
  supportingCopy:
    "Melalui riset, konsultasi, desain, dan prototyping, Niuva membantu organisasi mengubah kebutuhan menjadi arah produk yang dapat ditinjau sebelum realisasi.",
  contact: {
    location:
      "Bandung Techno Park, Gedung D Lt. 1 (Ruang Makerspace), Jl. Telekomunikasi No. 1, Sukapura",
    email: "niuvamakerspace@gmail.com",
    phone: "+62 851-1767-8901",
    phoneHref: "tel:+6285117678901",
  },
} as const;

export function createPublicWhatsAppHref(referenceNumber: string, phone: string = publicCompanyProfile.contact.phone): string {
  const phoneNumber = phone.replace(/\D/g, "");
  const message = `Halo Niuva, saya baru mengirim permintaan Custom Print dengan referensi ${referenceNumber}.`;

  return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
}

export function createB2BWhatsAppHref(phone: string, service?: string): string {
  const message = service
    ? `Halo Niuva, saya ingin membahas kebutuhan ${service}.`
    : "Halo Niuva, saya ingin membahas kebutuhan proyek.";
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

export const publicServices = [
  {
    slug: "riset-pengembangan",
    title: "Riset & Pengembangan",
    sourceScope:
      "Mengembangkan solusi melalui riset, eksplorasi teknologi, analisis, dan pengujian yang sistematis.",
    websiteFraming:
      "Mengubah ide menjadi solusi produk yang terukur dan teruji, berangkat dari analisis kebutuhan dan validasi yang sistematis.",
    inputs:
      "Tujuan awal, konteks pengguna, dan batasan yang sudah diketahui.",
    outputs:
      "Analisis kebutuhan, eksplorasi teknologi dan material, pengujian, serta dokumentasi teknis sesuai ruang lingkup yang disepakati.",
    tags: ["Analisis kebutuhan", "Eksplorasi teknologi", "Dokumentasi teknis"],
  },
  {
    slug: "desain-rekayasa",
    title: "Desain & Rekayasa",
    sourceScope:
      "Mengubah ide menjadi desain produk yang fungsional, ergonomis, estetis, dan siap dikembangkan.",
    websiteFraming:
      "Mengubah insight menjadi konsep yang fungsional, menarik, dan siap dikembangkan.",
    inputs:
      "Sketsa, CAD, referensi, atau prototipe awal beserta tujuan penggunaannya.",
    outputs:
      "Ideasi, model 3D dan CAD, pemilihan material dan komponen, serta pertimbangan DFM sesuai ruang lingkup yang disepakati.",
    tags: ["Ideasi", "CAD & rekayasa", "DFM"],
  },
  {
    slug: "prototipe-manufaktur-digital",
    title: "Prototipe & Manufaktur Digital",
    sourceScope:
      "Mewujudkan konsep menjadi bentuk fisik untuk pengujian, evaluasi, dan penyempurnaan desain.",
    websiteFraming:
      "Mewujudkan konsep menjadi mock-up, model skala, prototipe fungsional, atau komponen cetak 3D.",
    inputs:
      "Model 3D, CAD, atau desain yang ingin diwujudkan, beserta tujuan pengujian atau presentasinya.",
    outputs:
      "Prototipe visual, prototipe fungsional untuk pengujian, atau komponen cetak 3D sesuai ruang lingkup yang disepakati.",
    tags: ["Prototipe visual", "Prototipe fungsional", "Cetak 3D"],
  },
  {
    slug: "konsultansi-workshop",
    title: "Konsultansi & Workshop",
    sourceScope:
      "Pendampingan teknis dari pembentukan visi hingga persiapan manufaktur, serta penguatan kapabilitas tim klien.",
    websiteFraming:
      "Mendampingi tim dari konsep hingga spesifikasi dan persiapan manufaktur, serta melatih kemampuan praktis tim Anda.",
    inputs:
      "Tujuan diskusi, pihak yang terlibat, keputusan yang perlu dipetakan, atau kemampuan yang ingin dibangun tim.",
    outputs:
      "Arah visi desain, spesifikasi teknis, pemilihan material dan komponen, strategi manufaktur, atau pelatihan seperti design thinking serta CAD dan prototyping.",
    tags: ["Konsultansi teknis", "Workshop", "Pelatihan"],
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

/** Earlier service URLs, kept as permanent redirects to the service that took over their work. */
export const legacyServiceSlugs: Readonly<Record<string, (typeof publicServices)[number]["slug"]>> = {
  "research-development": "riset-pengembangan",
  "consultant-workshop": "konsultansi-workshop",
  "design-prototyping": "desain-rekayasa",
  "apparel-merchandise": "desain-rekayasa",
};

/** What Niuva makes, from NIUVA Profile 2026 p. 6. `href` points at the route that serves it, when one exists. */
export const publicProductTypes = [
  { title: "Produk Inovasi", description: "Pengembangan produk berbasis ide, teknologi, dan desain untuk menghasilkan solusi bernilai tambah." },
  { title: "Produk Kustom", description: "Produk yang dirancang dan dibuat sesuai kebutuhan, karakter, dan spesifikasi klien." },
  { title: "Produk Cetak 3D", description: "Produk berbasis teknologi 3D printing untuk kebutuhan fungsional, kreatif, prototipe, maupun merchandise.", href: "/custom-print" },
  { title: "Trofi & Penghargaan", description: "Desain dan pembuatan produk penghargaan untuk kompetisi, apresiasi, dan pencapaian organisasi." },
  { title: "Miniatur & Model Skala", description: "Representasi fisik objek atau lingkungan dalam skala tertentu untuk display, presentasi, edukasi, dan kebutuhan khusus." },
] as const satisfies readonly Readonly<{ title: string; description: string; href?: string }>[];

export const publicContentPublication = {
  contentVersion: publicContentVersion,
  publicIntegrationApproved: true,
  productionPublicationApproved: true,
} as const;
