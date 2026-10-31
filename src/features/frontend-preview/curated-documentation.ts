/**
 * Owner-approved project documentation, 2026-11-01.
 *
 * The Owner first approved the recommended images ("Setujui yang disarankan"),
 * then asked for every project's documentation to be used ("semua project yg ada
 * dokumentasinya masukan saja"), including the higher-risk images. Each file is an
 * embedded PDF image extracted without retouching (Elips is cut from its page as
 * printed). Width and height are the file's own pixels, so the detail page never
 * draws an image past its source size. Provenance per file lives in
 * docs/content/media-proofs/project-documentation/README.md.
 */

import type { InternalProofPath, PublicPortfolioMediaPath } from "./curated-content";

export type CuratedDocumentationProof = Readonly<{
  altText: string;
  height: number;
  internalPath: InternalProofPath;
  publicPath: PublicPortfolioMediaPath;
  sourceReference: string;
  width: number;
}>;

function proof(
  file: string,
  altText: string,
  sourceReference: string,
  width: number,
  height: number,
): CuratedDocumentationProof {
  return {
    altText,
    height,
    internalPath: `docs/content/media-proofs/project-documentation/${file}.png`,
    publicPath: `/media/portfolio/${file}.png`,
    sourceReference,
    width,
  };
}

/** Keyed by curated project id, in the order of the source documents. */
export const curatedProjectDocumentation: Readonly<Record<string, readonly CuratedDocumentationProof[]>> = {
  "CS-01": [
    proof("cs-01-smart-drop-box-dok-01", "Dokumentasi presentasi Smart Drop Box kepada pemangku kepentingan.", "SRC-PORT-001 p.5", 1040, 780),
    proof("cs-01-smart-drop-box-dok-02", "Gambar teknik Smart Drop Box dari beberapa pandangan.", "SRC-PDS-001 p.13", 1268, 448),
    proof("cs-01-smart-drop-box-dok-03", "Sketsa eksplorasi bentuk Smart Drop Box.", "SRC-PDS-001 p.13", 599, 736),
  ],
  "CS-02": [
    // Development context only; the dossier keeps open whether this body realizes Niuva's design.
    proof("cs-02-motor-ev-dok-01", "Motor listrik fisik sebagai konteks pengembangan; belum dikonfirmasi sebagai wujud akhir desain Niuva.", "SRC-COMPANY-001 p.10", 555, 414),
  ],
  "CS-05": [
    proof("cs-05-bagit-dok-01", "Sketsa konsep Arei Smart Bag V1 dengan sensor dan layar LCD.", "SRC-PORT-001 p.10", 556, 291),
    proof("cs-05-bagit-dok-02", "Sketsa teknis ransel Arei Smart Bag V1.", "SRC-PORT-001 p.10", 486, 642),
    proof("cs-05-bagit-dok-03", "Purwarupa V1 dengan kompartemen elektronik.", "SRC-PORT-001 p.10", 548, 274),
    proof("cs-05-bagit-dok-08", "Rangkaian elektronik dan aplikasi ponsel pada purwarupa V1.", "SRC-PORT-001 p.10", 345, 447),
    proof("cs-05-bagit-dok-04", "Purwarupa ransel Arei Smart Bag V1.", "SRC-PORT-001 p.10", 640, 1045),
    proof("cs-05-bagit-dok-05", "Letak tag RFID, pembaca RFID, dan powerbank pada Bagit V2.", "SRC-PORT-001 p.11", 918, 638),
    proof("cs-05-bagit-dok-06", "Panduan penggunaan Bagit V2 dengan aplikasi ponsel.", "SRC-PORT-001 p.11", 1008, 641),
    proof("cs-05-bagit-dok-07", "Bagit V2 dipakai di jalur pendakian.", "SRC-PORT-001 p.11", 501, 563),
  ],
  "CS-03": [
    proof("cs-03-simulator-dok-01", "Rangkaian elektronik di dalam rangka simulator selama pengembangan.", "SRC-COMPANY-001 p.12", 401, 572),
    proof("cs-03-simulator-dok-02", "Setup simulator berkendara dengan sepeda motor dan layar monitor.", "SRC-COMPANY-002 p.13", 576, 967),
  ],
  "CS-06": [
    proof("cs-06-savero-dok-11", "Render tekstur logo Savero pada bahan.", "SRC-PORT-001 p.3", 433, 348),
    proof("cs-06-savero-dok-01", "Render front lid ransel Savero.", "SRC-PORT-001 p.3", 640, 423),
    proof("cs-06-savero-dok-02", "Render penarik ritsleting Savero.", "SRC-PORT-001 p.3", 478, 388),
    proof("cs-06-savero-dok-03", "Render penarik ritsleting dengan aksen merah.", "SRC-PORT-001 p.3", 640, 322),
    proof("cs-06-savero-dok-04", "Render emblem logo Savero.", "SRC-PORT-001 p.3", 810, 548),
    proof("cs-06-savero-dok-05", "Render pelat nama Savero Spirit of Style.", "SRC-PORT-001 p.3", 897, 282),
    proof("cs-06-savero-dok-06", "Label dan kemasan identitas Polo Savero.", "SRC-PDS-001 p.3", 734, 1095),
    proof("cs-06-savero-dok-12", "Desain label gantung Savero.", "SRC-PDS-001 p.3", 616, 725),
    proof("cs-06-savero-dok-13", "Desain label dan kartu Polo Savero.", "SRC-PDS-001 p.3", 444, 850),
    proof("cs-06-savero-dok-14", "Desain label orientasi dan keterangan produk.", "SRC-PDS-001 p.3", 435, 429),
    proof("cs-06-savero-dok-15", "Eksplorasi label kraft Savero.", "SRC-PDS-001 p.3", 433, 800),
    proof("cs-06-savero-dok-07", "Gambar teknik tag logo Savero.", "SRC-PDS-001 p.4", 1025, 1007),
    proof("cs-06-savero-dok-08", "Rangkaian aksesori brand Savero.", "SRC-PDS-001 p.4", 1025, 917),
    proof("cs-06-savero-dok-16", "Variasi warna label tenun Savero.", "SRC-PDS-001 p.4", 910, 475),
    proof("cs-06-savero-dok-17", "Render varian front lid Savero.", "SRC-PDS-001 p.5", 640, 357),
    proof("cs-06-savero-dok-09", "Gambar teknik front lid skala 1:1.", "SRC-PDS-001 p.5", 734, 485),
    proof("cs-06-savero-dok-10", "Gambar teknik back system skala 1:1.", "SRC-PDS-001 p.5", 594, 982),
    proof("cs-06-savero-dok-18", "Render varian penarik ritsleting Savero.", "SRC-PDS-001 p.6", 640, 330),
    proof("cs-06-savero-dok-19", "Gambar garis penarik ritsleting Savero.", "SRC-PDS-001 p.6", 640, 282),
    proof("cs-06-savero-dok-20", "Gambar teknik pelat nama Savero.", "SRC-PDS-001 p.7", 725, 364),
    proof("cs-06-savero-dok-21", "Logo Savero pada latar hitam.", "SRC-PDS-001 p.7", 374, 183),
    proof("cs-06-savero-dok-22", "Gambar teknik logo Savero tampak depan, kanan, dan bawah.", "SRC-PDS-001 p.7", 806, 572),
  ],
  "CS-04": [
    proof("cs-04-beventu-dok-01", "Render tampak depan BeVenTU dengan panel kontrol.", "SRC-PORT-001 p.6", 1119, 467),
    proof("cs-04-beventu-dok-03", "Lembar spesifikasi BeVenTU; angka teknis di dalamnya belum diverifikasi.", "SRC-PORT-001 p.6", 935, 487),
    proof("cs-04-beventu-dok-02", "Render alternatif bentuk BeVenTU dalam beberapa varian.", "SRC-PORT-001 p.6", 809, 446),
  ],
  "SW-01": [
    proof("sw-01-waste-based-product-dok-01", "Render konsep wadah dan rak.", "SRC-PORT-001 p.1", 337, 450),
    proof("sw-01-waste-based-product-dok-02", "Rak piring dan keranjang kayu dari dokumentasi sumber.", "SRC-PORT-001 p.1", 889, 333),
  ],
  "SW-02": [
    proof("sw-02-elips-tandem-bike-dok-01", "Render Elips tricycle dari beberapa pandangan.", "SRC-PORT-001 p.2", 471, 473),
  ],
  "SW-03": [
    proof("sw-03-screen-printing-workstation-dok-01", "Render modul meja kerja sablon dengan rak pengering.", "SRC-PORT-001 p.4", 640, 480),
    proof("sw-03-screen-printing-workstation-dok-02", "Render tata letak area kerja sablon.", "SRC-PORT-001 p.4", 485, 333),
  ],
  "SW-04": [
    proof("sw-04-portable-handwash-station-dok-01", "Unit fisik stasiun cuci tangan dengan tangki dan rangka bening.", "SRC-PORT-001 p.7", 758, 740),
    proof("sw-04-portable-handwash-station-dok-02", "Rangkaian elektronik di dalam unit.", "SRC-PORT-001 p.7", 259, 394),
  ],
  "SW-05": [
    proof("sw-05-konsep-sterilizer-tunnel-dok-01", "Render interior terowongan sterilisasi tiga fase.", "SRC-PORT-001 p.8", 1009, 324),
    proof("sw-05-konsep-sterilizer-tunnel-dok-02", "Render jalur di dalam terowongan.", "SRC-PORT-001 p.8", 1009, 492),
    proof("sw-05-konsep-sterilizer-tunnel-dok-03", "Render bilik sterilisasi dua fase.", "SRC-PORT-001 p.9", 1025, 1078),
    proof("sw-05-konsep-sterilizer-tunnel-dok-04", "Bilik sterilisasi di area terbuka.", "SRC-PORT-001 p.9", 1560, 526),
    proof("sw-05-konsep-sterilizer-tunnel-dok-05", "Seorang anak mencoba wastafel pada bilik sterilisasi.", "SRC-PORT-001 p.9", 1148, 646),
  ],
  "SW-06": [
    proof("sw-06-mock-up-model-militer-skala-1-10-pindad-dok-01", "Foto bersama di samping banner Medium Tank 105 mm.", "SRC-PDS-001 p.8", 1062, 627),
  ],
  "SW-07": [
    proof("sw-07-field-kitchen-truck-bhimasena-dok-02", "Kendaraan dapur lapangan Marinir sebagai konteks model.", "SRC-PDS-001 p.9", 691, 353),
    proof("sw-07-field-kitchen-truck-bhimasena-dok-01", "Model truk dapur lapangan di meja pameran.", "SRC-PDS-001 p.9", 1040, 585),
  ],
  "SW-08": [
    proof("sw-08-pengembangan-tas-kulit-yogyakarta-dok-01", "Stan pameran produk kulit bersama Disperindag D.I. Yogyakarta.", "SRC-PDS-001 p.10", 1040, 585),
    proof("sw-08-pengembangan-tas-kulit-yogyakarta-dok-02", "Tas kulit berwarna cokelat tua.", "SRC-PDS-001 p.11", 585, 602),
  ],
  "SW-09": [
    proof("sw-09-konsep-mobil-listrik-telkom-university-dok-01", "Perakitan rangka dan bodi mobil listrik di bengkel.", "SRC-PDS-001 p.12", 892, 585),
    proof("sw-09-konsep-mobil-listrik-telkom-university-dok-02", "Panel bodi kayu dipasang pada rangka.", "SRC-PDS-001 p.12", 1040, 441),
    proof("sw-09-konsep-mobil-listrik-telkom-university-dok-03", "Tim merakit bodi kendaraan.", "SRC-PDS-001 p.12", 1041, 648),
    proof("sw-09-konsep-mobil-listrik-telkom-university-dok-04", "Bentuk bodi kendaraan selama perakitan.", "SRC-PDS-001 p.12", 745, 585),
  ],
  "SW-10": [
    proof("sw-10-redesain-motor-xeon-konversi-listrik-dok-01", "Ruang baterai motor untuk konversi listrik.", "SRC-COMPANY-001 p.9", 554, 413),
  ],
  "SW-11": [
    proof("sw-11-bicycle-arcade-agate-dok-01", "Perangkat sepeda arcade di area kerja.", "SRC-COMPANY-001 p.11", 385, 546),
    proof("sw-11-bicycle-arcade-agate-dok-02", "Perakitan perangkat sepeda arcade di ruang kerja.", "SRC-COMPANY-002 p.13", 822, 1096),
    proof("sw-11-bicycle-arcade-agate-dok-03", "Render instalasi arcade sepeda bertema Stranger Things.", "SRC-COMPANY-002 p.13", 1280, 714),
  ],
};
