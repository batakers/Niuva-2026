/**
 * Owner-reviewed Niuva content prepared for development preview.
 *
 * This module deliberately contains no runtime/environment switch. Consumers
 * must import it through the server-only preview boundary so production reads
 * cannot load these records by accident.
 */

export const portfolioServiceCategories = [
  "Research & Development",
  "Consultant & Workshop",
  "Design & Prototyping",
  "Apparel & Merchandise",
] as const;

export type PortfolioServiceCategory = (typeof portfolioServiceCategories)[number];
export type ContentReviewStatus = "owner-approved" | "candidate";
export type DetailReadiness = "full-conservative-draft" | "summary-only" | "card-only";
export type InternalProofPath = `docs/content/media-proofs/featured-covers/${string}.png`;

export type CuratedPublicationBoundary = Readonly<{
  environment: "development-preview";
  publicIntegrationApproved: false;
  productionPublicationApproved: false;
}>;

export type CuratedCoverProof = Readonly<{
  internalPath: InternalProofPath;
  altText: string;
  sourceReference: string;
  reviewStatus: "owner-approved-proof";
  productionReady: false;
}>;

export type CuratedFeaturedProject = Readonly<{
  id: `CS-0${1 | 2 | 3 | 4 | 5 | 6}`;
  slug: string;
  title: string;
  service: PortfolioServiceCategory;
  tags: readonly string[];
  clientOrPartnerLabel: string | null;
  year: number | null;
  summary: string;
  detailReadiness: Exclude<DetailReadiness, "card-only">;
  story: Readonly<{
    overview: string;
    challenge?: string;
    process?: string;
    output: string;
    evidenceBoundary: string;
  }>;
  sources: readonly string[];
  cover: CuratedCoverProof;
  copyReviewStatus: "owner-approved";
  publication: CuratedPublicationBoundary;
}>;

export type CuratedSelectedWork = Readonly<{
  id: `SW-${string}`;
  slug: string;
  title: string;
  service: PortfolioServiceCategory;
  tags: readonly string[];
  summary: string;
  sources: readonly string[];
  detailReadiness: "card-only";
  copyReviewStatus: "owner-approved";
  publication: CuratedPublicationBoundary;
}>;

const previewOnly = {
  environment: "development-preview",
  publicIntegrationApproved: false,
  productionPublicationApproved: false,
} as const satisfies CuratedPublicationBoundary;

export const curatedPreviewMetadata = {
  datasetId: "niuva-portfolio-curation-v1",
  dossierPath: "docs/content/niuva-content-curation-dossier.md",
  ownerReviewDate: "2026-09-10",
  environment: "development-preview",
  publicIntegrationApproved: false,
  productionPublicationApproved: false,
} as const;

export const curatedCompanyProfile = {
  reviewStatus: "owner-approved",
  headline: "Mitra pengembangan produk dari riset hingga prototipe.",
  supportingCopy:
    "Melalui riset, konsultasi, desain, dan prototyping, Niuva membantu organisasi mengubah kebutuhan menjadi arah produk yang dapat ditinjau sebelum realisasi.",
  contact: {
    location:
      "Bandung Techno Park — Gedung D Lt. 1 (Ruang Makerspace), Jl. Telekomunikasi No. 1, Sukapura",
    email: "niuvamakerspace@gmail.com",
    phone: "+62 851-1767-8901",
  },
  publication: previewOnly,
} as const satisfies Readonly<{
  reviewStatus: "owner-approved";
  headline: string;
  supportingCopy: string;
  contact: Readonly<{ location: string; email: string; phone: string }>;
  publication: CuratedPublicationBoundary;
}>;

export const curatedServices = [
  {
    slug: "research-development",
    title: "Research & Development",
    sourceScope:
      "Systematic product and technology development intended to support company innovation.",
    websiteFraming:
      "Explore needs, constraints, and technical direction before a product decision is finalized.",
    reviewStatus: "owner-approved",
    publication: previewOnly,
  },
  {
    slug: "consultant-workshop",
    title: "Consultant & Workshop",
    sourceScope:
      "Design recommendations from vision toward manufacturing, plus interactive training for skills and collaboration.",
    websiteFraming:
      "Structured consultation and practical workshops that help teams align decisions and build capability.",
    reviewStatus: "owner-approved",
    publication: previewOnly,
  },
  {
    slug: "design-prototyping",
    title: "Design & Prototyping",
    sourceScope:
      "Visual-idea development through design and rapid prototyping for concept review and functional testing.",
    websiteFraming:
      "Translate an idea into design artifacts and prototypes that can be reviewed and iterated.",
    reviewStatus: "owner-approved",
    publication: previewOnly,
  },
  {
    slug: "apparel-merchandise",
    title: "Apparel & Merchandise",
    sourceScope:
      "Product design intended to reflect brand identity and market relevance.",
    websiteFraming:
      "Develop branded apparel, merchandise, and accessories from visual direction toward production preparation.",
    reviewStatus: "owner-approved",
    publication: previewOnly,
  },
] as const satisfies readonly Readonly<{
  slug: string;
  title: PortfolioServiceCategory;
  sourceScope: string;
  websiteFraming: string;
  reviewStatus: ContentReviewStatus;
  publication: CuratedPublicationBoundary;
}>[];

/** Editorial order approved by the Owner; it is not a chronological claim. */
export const curatedFeaturedProjects = [
  {
    id: "CS-01",
    slug: "smart-drop-box-pg",
    title: "Smart Drop Box — P&G",
    service: "Design & Prototyping",
    tags: ["Product Development", "Industrial Design", "Plastic Collection", "Sustainability Program"],
    clientOrPartnerLabel: "P&G",
    year: 2018,
    summary:
      "Pada 2018, tim Niuva mengembangkan industrial/product design Smart Drop Box untuk P&G/Head & Shoulders dalam konteks program keberlanjutan yang mendukung pengumpulan kemasan plastik bekas.",
    detailReadiness: "full-conservative-draft",
    story: {
      overview:
        "Pada 2018, tim Niuva mengembangkan industrial/product design Smart Drop Box untuk P&G/Head & Shoulders dalam konteks program keberlanjutan yang mendukung pengumpulan kemasan plastik bekas.",
      challenge:
        "Kebutuhan program diterjemahkan menjadi sebuah titik pengumpulan fisik yang memadukan area masuk kemasan, identitas brand, serta ruang bagi indikator, sensor, pencahayaan, dan komponen daya. Narasi ini menjelaskan kebutuhan desain yang terlihat pada dokumen; ia tidak menyatakan performa komponen.",
      process:
        "Tim Niuva mengeksplorasi bentuk melalui sketsa, menyusun gambar teknik berdimensi, memetakan komponen dan material, lalu menyiapkan visualisasi serta dukungan desain menuju fabrikasi prototype.",
      output:
        "Dokumentasi memperlihatkan paket desain berupa sketsa konsep, gambar teknik, callout komponen/material, visualisasi produk, dan sebuah prototype fisik yang dipresentasikan kepada stakeholder.",
      evidenceBoundary:
        "Tidak menyatakan deployment, produksi massal, performa teknis, jumlah sampah terkumpul, perubahan perilaku, atau dampak lingkungan maupun bisnis.",
    },
    sources: ["SRC-PORT-001 p.5", "SRC-PDS-001 p.13"],
    cover: {
      internalPath: "docs/content/media-proofs/featured-covers/cs-01-smart-drop-box.png",
      altText:
        "Visualisasi Smart Drop Box berwarna putih dan biru dengan beberapa pandangan komponen.",
      sourceReference: "SRC-PDS-001 p.13",
      reviewStatus: "owner-approved-proof",
      productionReady: false,
    },
    copyReviewStatus: "owner-approved",
    publication: previewOnly,
  },
  {
    id: "CS-02",
    slug: "konsep-desain-eksterior-motor-ev-pindad",
    title: "Konsep dan Desain Eksterior Motor EV — PT Pindad",
    service: "Design & Prototyping",
    tags: ["Mobility", "Electric Vehicle", "Exterior Design", "Concept Development"],
    clientOrPartnerLabel: "PT Pindad",
    year: null,
    summary:
      "Dalam konteks pengembangan motor listrik PT Pindad, Niuva berkontribusi pada pengembangan konsep produk dan desain bentuk bodi/eksterior untuk kebutuhan mobilitas operasional yang adaptif dan fungsional.",
    detailReadiness: "summary-only",
    story: {
      overview:
        "Materi proyek menampilkan visualisasi desain serta konteks pengembangan motor fisik, tanpa menyatakan desain tersebut sebagai produk final atau telah digunakan secara operasional.",
      output:
        "Materi yang tersedia mendokumentasikan visualisasi desain eksterior/bodi bersama foto motor sebagai konteks pengembangan.",
      evidenceBoundary:
        "Tidak menyatakan deployment militer, validasi lapangan, spesifikasi performa, sertifikasi, status produksi, atau penggunaan operasional.",
    },
    sources: ["SRC-COMPANY-001 p.10"],
    cover: {
      internalPath: "docs/content/media-proofs/featured-covers/cs-02-motor-ev.png",
      altText: "Visualisasi samping konsep motor listrik berwarna hijau.",
      sourceReference: "SRC-COMPANY-001 p.10",
      reviewStatus: "owner-approved-proof",
      productionReady: false,
    },
    copyReviewStatus: "owner-approved",
    publication: previewOnly,
  },
  {
    id: "CS-05",
    slug: "bagit-arei-smart-bag-v2",
    title: "Bagit — Arei Smart Bag V2",
    service: "Apparel & Merchandise",
    tags: ["Bag Development", "Product Iteration", "Outdoor Equipment", "Detail Development"],
    clientOrPartnerLabel: "Arei",
    year: null,
    summary:
      "Bagit — Arei Smart Bag V2 menunjukkan proses pengembangan iteratif konsep tas dari V1 menuju V2.",
    detailReadiness: "summary-only",
    story: {
      overview:
        "Dokumentasi proyek menampilkan eksplorasi bentuk, detail komponen, dan konteks penggunaan luar ruang.",
      output:
        "Materi yang tersedia mendukung cerita visual pengembangan V1 ke V2 dan memperlihatkan produk V2 dalam konteks penggunaan.",
      evidenceBoundary:
        "Tidak mengklaim fungsi pintar tertentu, spesifikasi material, status produksi, hasil pengujian, daya tahan, volume produksi, peluncuran retail, atau dampak penjualan.",
    },
    sources: ["SRC-PORT-001 pp.10–11"],
    cover: {
      internalPath: "docs/content/media-proofs/featured-covers/cs-05-bagit.png",
      altText: "Tampilan depan tas ransel hijau Bagit Arei Smart Bag V2.",
      sourceReference: "SRC-PORT-001 p.11",
      reviewStatus: "owner-approved-proof",
      productionReady: false,
    },
    copyReviewStatus: "owner-approved",
    publication: previewOnly,
  },
  {
    id: "CS-03",
    slug: "simulator-keselamatan-berkendara-agate-denso",
    title: "Simulator Keselamatan Berkendara — Agate / PT DENSO",
    service: "Design & Prototyping",
    tags: ["Training Simulator", "Safety Riding", "Interactive Product", "Product Development"],
    clientOrPartnerLabel: "Agate / PT DENSO",
    year: null,
    summary:
      "Niuva terlibat dalam pengembangan simulator berkendara berbasis sepeda motor untuk mendukung pelatihan keselamatan berkendara bagi karyawan PT DENSO, dalam proyek yang melibatkan Agate.",
    detailReadiness: "summary-only",
    story: {
      overview:
        "Dokumentasi yang tersedia memperlihatkan konfigurasi fisik simulator dan bagian internal perangkat, tanpa menetapkan pembagian tanggung jawab teknis atau mengklaim hasil penerapannya.",
      output:
        "Sumber mendokumentasikan setup fisik simulator dan satu pandangan komponen internal.",
      evidenceBoundary:
        "Tidak mengklaim deployment, hasil pembelajaran, penurunan insiden, kepemilikan perangkat lunak, validasi, atau skala penggunaan.",
    },
    sources: ["SRC-COMPANY-001 p.12"],
    cover: {
      internalPath: "docs/content/media-proofs/featured-covers/cs-03-simulator.png",
      altText:
        "Sepeda motor pada rangka penyangga di area kerja sebagai konteks perangkat simulator.",
      sourceReference: "SRC-COMPANY-001 p.12",
      reviewStatus: "owner-approved-proof",
      productionReady: false,
    },
    copyReviewStatus: "owner-approved",
    publication: previewOnly,
  },
  {
    id: "CS-06",
    slug: "savero-identitas-visual-aksesori-produk",
    title: "Savero — Identitas Visual dan Aksesori Produk",
    service: "Apparel & Merchandise",
    tags: ["Brand Identity", "Product Accessories", "Industrial Design", "Detail Development"],
    clientOrPartnerLabel: "Savero",
    year: null,
    summary:
      "Untuk Savero, Niuva mengembangkan aplikasi identitas visual dan konsep aksesori produk melalui studi sistem penutup depan dan belakang, ritsleting, logo, detail komponen, gambar berdimensi, serta visualisasi produk.",
    detailReadiness: "summary-only",
    story: {
      overview:
        "Dokumentasi memperlihatkan penerjemahan elemen identitas ke dalam detail produk.",
      output:
        "Artefak yang tersedia mencakup aplikasi identitas, studi desain berdimensi, dan visualisasi aksesori.",
      evidenceBoundary:
        "Tidak mengklaim material, proses manufaktur, volume produksi, status peluncuran, daya tahan, penjualan, atau performa komersial.",
    },
    sources: ["SRC-PORT-001 p.3", "SRC-PDS-001 pp.3–7"],
    cover: {
      internalPath: "docs/content/media-proofs/featured-covers/cs-06-savero.png",
      altText:
        "Komposisi visual beberapa konsep aksesori produk Savero berwarna hitam dan merah.",
      sourceReference: "SRC-PORT-001 p.3",
      reviewStatus: "owner-approved-proof",
      productionReady: false,
    },
    copyReviewStatus: "owner-approved",
    publication: previewOnly,
  },
  {
    id: "CS-04",
    slug: "beventu-konsep-sistem-ventilator-darurat",
    title: "BeVenTU — Konsep Sistem Ventilator Darurat",
    service: "Design & Prototyping",
    tags: ["Healthcare Product", "Industrial Design", "Concept Development", "Form Exploration"],
    clientOrPartnerLabel: null,
    year: null,
    summary:
      "BeVenTU mendokumentasikan pengembangan konsep sistem ventilator darurat melalui eksplorasi alternatif bentuk, visualisasi tata letak sistem, dan presentasi desain industri.",
    detailReadiness: "summary-only",
    story: {
      overview:
        "Materi yang tersedia menunjukkan proses desain produk dan artefak visual, tanpa menyatakan bahwa perangkat telah dibuat, diuji, disertifikasi, diproduksi, atau digunakan secara klinis.",
      output:
        "Artefak yang terdokumentasi mencakup alternatif desain, pandangan produk, dan visualisasi tata letak sistem.",
      evidenceBoundary:
        "Tidak membuat klaim efektivitas medis, klinis, persetujuan regulasi, produksi, penggunaan rumah sakit, hasil pasien, spesifikasi, atau kepemilikan IP.",
    },
    sources: ["SRC-PORT-001 p.6"],
    cover: {
      internalPath: "docs/content/media-proofs/featured-covers/cs-04-beventu.png",
      altText: "Visualisasi konsep perangkat BeVenTU berwarna putih dengan panel depan.",
      sourceReference: "SRC-PORT-001 p.6",
      reviewStatus: "owner-approved-proof",
      productionReady: false,
    },
    copyReviewStatus: "owner-approved",
    publication: previewOnly,
  },
] as const satisfies readonly CuratedFeaturedProject[];

export const curatedSelectedWorks = [
  {
    id: "SW-01",
    slug: "waste-based-product",
    title: "Waste-Based Product",
    service: "Research & Development",
    tags: ["Waste-Based Material", "Material Exploration", "Design Exploration"],
    summary:
      "Waste-Based Product menampilkan eksplorasi visual produk dengan pendekatan material berbasis limbah. Jenis dan sumber material, proses pengolahan, fungsi produk, tahap realisasi, serta hasilnya belum dinyatakan dalam dokumentasi yang tersedia.",
    sources: ["SRC-PORT-001 p.1"],
    detailReadiness: "card-only",
    copyReviewStatus: "owner-approved",
    publication: previewOnly,
  },
  {
    id: "SW-02",
    slug: "elips-tandem-bike",
    title: "Elips Tandem Bike",
    service: "Design & Prototyping",
    tags: ["Mobility", "Tandem Bicycle", "Family Mobility", "Industrial Design"],
    summary:
      "Elips Tandem Bike menampilkan konsep sepeda tandem untuk mobilitas bersama anak dan pendamping. Dokumentasi yang tersedia memperlihatkan arah desain produk serta hubungan posisi kedua pengguna, tanpa menyatakan status purwarupa, pengujian keselamatan, produksi, atau hasil penggunaan.",
    sources: ["SRC-PORT-001 p.2"],
    detailReadiness: "card-only",
    copyReviewStatus: "owner-approved",
    publication: previewOnly,
  },
  {
    id: "SW-03",
    slug: "screen-printing-workstation",
    title: "Screen Printing Workstation",
    service: "Design & Prototyping",
    tags: ["Workstation", "Industrial Design", "Product Visualization", "Detail Development"],
    summary:
      "Screen Printing Workstation menampilkan studi desain stasiun kerja untuk aktivitas sablon melalui beberapa pandangan produk dan visualisasi detail. Dokumentasi yang tersedia belum membuktikan validasi ergonomi, purwarupa fisik, proses manufaktur, status kekayaan intelektual, atau penggunaan operasional.",
    sources: ["SRC-PORT-001 p.4"],
    detailReadiness: "card-only",
    copyReviewStatus: "owner-approved",
    publication: previewOnly,
  },
  {
    id: "SW-04",
    slug: "portable-handwash-station",
    title: "Portable Handwash Station",
    service: "Design & Prototyping",
    tags: ["Public Hygiene", "Handwashing Station", "Portable Product", "Product Visualization"],
    summary:
      "Portable Handwash Station menampilkan visualisasi desain stasiun cuci tangan portabel untuk konteks kebersihan publik. Dokumentasi yang tersedia belum menjelaskan mekanisme air, spesifikasi sanitasi, tahap fisik, proses produksi, penerapan, atau hasil penggunaan.",
    sources: ["SRC-PORT-001 p.7"],
    detailReadiness: "card-only",
    copyReviewStatus: "owner-approved",
    publication: previewOnly,
  },
  {
    id: "SW-05",
    slug: "konsep-sterilizer-tunnel",
    title: "Konsep Sterilizer Tunnel — Varian 2 Fase dan 3 Fase",
    service: "Design & Prototyping",
    tags: ["Public Hygiene", "System Concept", "Variant Development", "Product Visualization"],
    summary:
      "Dokumentasi proyek menampilkan eksplorasi visual konsep Sterilizer Tunnel dalam varian 2 fase dan 3 fase untuk konteks kebersihan publik. Materi yang tersedia tidak membuktikan mekanisme, keamanan, efektivitas sterilisasi, validasi, realisasi fisik, ataupun penerapannya.",
    sources: ["SRC-PORT-001 pp.8–9"],
    detailReadiness: "card-only",
    copyReviewStatus: "owner-approved",
    publication: previewOnly,
  },
  {
    id: "SW-06",
    slug: "mock-up-model-militer-skala-1-10-pindad",
    title: "Mock-up Model Militer Skala 1:10 — PT Pindad",
    service: "Design & Prototyping",
    tags: ["Scale Model", "Model Making", "Mobility", "Defense"],
    summary:
      "Dokumentasi proyek menampilkan mock-up model militer skala 1:10 dalam konteks PT Pindad. Kartu ini membatasi klaim pada artefak model yang terlihat dan tidak menyatakan bahwa Niuva merancang kendaraan asli, mengembangkan sistem militer, melakukan rekayasa kendaraan, atau memproduksi unit skala penuh.",
    sources: ["SRC-PDS-001 p.8"],
    detailReadiness: "card-only",
    copyReviewStatus: "owner-approved",
    publication: previewOnly,
  },
  {
    id: "SW-07",
    slug: "field-kitchen-truck-bhimasena",
    title: "Field Kitchen Truck — PT Bhimasena R&D",
    service: "Design & Prototyping",
    tags: ["Special Vehicle", "Scale Model", "Model Making", "Product Visualization"],
    summary:
      "Dokumentasi Field Kitchen Truck menampilkan artefak model dan visualisasi kendaraan khusus dalam konteks PT Bhimasena R&D. Kartu ini tidak menetapkan nama Ganilla, skala model, tujuan operasional, kepemilikan desain kendaraan, tanggung jawab fabrikasi, ataupun hasil penerapannya.",
    sources: ["SRC-PDS-001 p.9"],
    detailReadiness: "card-only",
    copyReviewStatus: "owner-approved",
    publication: previewOnly,
  },
  {
    id: "SW-08",
    slug: "pengembangan-tas-kulit-yogyakarta",
    title: "Pengembangan Tas Kulit — D.I. Yogyakarta",
    service: "Apparel & Merchandise",
    tags: ["Leather Product", "Product Development", "Workshop Documentation"],
    summary:
      "Dokumentasi proyek menampilkan produk tas kulit dan suasana kegiatan pengembangan di D.I. Yogyakarta. Kartu ini tidak menetapkan nama resmi instansi, bentuk program, identitas atau peran peserta, kepemilikan desain produk, keluaran final, maupun hasil kegiatan.",
    sources: ["SRC-PDS-001 pp.10–11"],
    detailReadiness: "card-only",
    copyReviewStatus: "owner-approved",
    publication: previewOnly,
  },
  {
    id: "SW-09",
    slug: "konsep-mobil-listrik-telkom-university",
    title: "Konsep Mobil Listrik — Telkom University",
    service: "Design & Prototyping",
    tags: ["Mobility", "Electric Vehicle", "Concept Development", "Product Visualization"],
    summary:
      "Dokumentasi proyek menampilkan proses dan visualisasi konsep mobil listrik dalam konteks Telkom University. Kartu ini tidak menetapkan kepemilikan desain kendaraan, ruang lingkup motor listrik atau baterai, tahap purwarupa, pengujian, kelayakan jalan, produksi, ataupun hasil proyek.",
    sources: ["SRC-PDS-001 p.12"],
    detailReadiness: "card-only",
    copyReviewStatus: "owner-approved",
    publication: previewOnly,
  },
  {
    id: "SW-10",
    slug: "redesain-motor-xeon-konversi-listrik",
    title: "Redesain Motor Xeon untuk Konversi Listrik",
    service: "Design & Prototyping",
    tags: ["Mobility", "Electric Conversion", "Exterior Design", "Product Redesign"],
    summary:
      "Dokumentasi proyek memperlihatkan konteks sebelum–sesudah redesain Motor Xeon untuk konversi listrik. Kartu ini menampilkan arah perubahan desain eksterior tanpa menyatakan bahwa Niuva mengerjakan motor listrik, baterai, kontroler, rekayasa bodi, purwarupa fungsional, pengujian, kelayakan jalan, atau produksi kendaraan.",
    sources: ["SRC-COMPANY-001 p.9"],
    detailReadiness: "card-only",
    copyReviewStatus: "owner-approved",
    publication: previewOnly,
  },
  {
    id: "SW-11",
    slug: "bicycle-arcade-agate",
    title: "Bicycle Arcade — Agate",
    service: "Design & Prototyping",
    tags: ["Interactive Product", "Bicycle Interface", "Entertainment", "Physical Interaction"],
    summary:
      "Bicycle Arcade menampilkan perangkat interaktif berbasis sepeda dalam proyek yang melibatkan Agate dan dikaitkan oleh sumber dengan konteks rilis Stranger Things. Dokumentasi tidak menetapkan struktur hubungan para pihak, kepemilikan perangkat keras atau perangkat lunak, mekanisme interaksi, tahap penyerahan, penerapan, maupun hasil penggunaan.",
    sources: ["SRC-COMPANY-001 p.11"],
    detailReadiness: "card-only",
    copyReviewStatus: "owner-approved",
    publication: previewOnly,
  },
] as const satisfies readonly CuratedSelectedWork[];
